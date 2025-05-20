import CredentialsProvider from 'next-auth/providers/credentials';
// import { emailLoginSchema } from './loginDTOSchema';
import loginSchema from './loginDTOSchema';
import authDbConnect from '@/app/lib/mongodbConnections/authDbConnect';
import mongoose from 'mongoose';
import User from '@/app/models/auth/User';
import Session from '@/app/models/auth/Session';
import LoginHistory from '@/app/models/auth/LoginHistory';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { encrypt, decrypt } from '@/app/utils/encryptToken';

// import GoogleProvider from 'next-auth/providers/google';
// import AppleProvider from 'next-auth/providers/apple';
// import FacebookProvider from "next-auth/providers/facebook";
// import GitHubProvider from "next-auth/providers/github";

authDbConnect()

function calculateLockTime(failedAttempts) {
  const MAX_LOGIN_ATTEMPT =  Number(process.env.MAX_LOGIN_ATTEMPT )|| 5;
  if (failedAttempts < MAX_LOGIN_ATTEMPT) return null;
  
  const lockMinutes = Math.pow(2, failedAttempts - MAX_LOGIN_ATTEMPT);
  return new Date(Date.now() + lockMinutes * 60000);
}

async function incrementFailedLogin(user) {
  const failedAttempts = (user.security?.failedAttempts || 0) + 1;
  const lockUntil = calculateLockTime(failedAttempts);

  await User.updateOne(
    { _id: user._id },
    {
      $inc: { "security.failedAttempts": 1 },
      $set: { "lock.lockUntil": lockUntil }
    }
  );
}

async function resetFailedLogin(user) {
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        "security.failedAttempts": 0,
        "lock.lockUntil": null,
        "security.lastLogin": new Date()
      }
    }
  );
}

const generateTokens = async (user) => {
    // Access Token (JWT)
    const accessToken = jwt.sign(
        {
            userId: user._id,
            role: user.role,
            sessionId: crypto.randomBytes(16).toString('hex')
        },
        process.env.USER_ACCESS_TOKEN_SECRET,
        { 
            expiresIn: '15m', 
            algorithm: 'RS256' // Asymmetric encryption
        }
    );

    // Refresh Token (Opaque)
    const refreshToken = crypto.randomBytes(64).toString('hex');
    
    // Store refresh token in Redis with expiry
    await redis.set(
        `refresh_token:${user._id}:${refreshToken}`,
        'valid',
        'EX', 7 * 24 * 60 * 60 // 7 days
    );

    return { accessToken, refreshToken };
};

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: 'identifier-password-login',
            id: 'identifier-password-login',
            credentials: {
                identifier: { label: 'Username/Email', type: 'text', placeholder: 'Username/Email' },
                password: { label: 'Password', type: 'password', placeholder: 'password' }
            },

            async authorize(credentials, req) {
                try {
                    const parsed = loginSchema.safeParse(credentials);
                    if (!parsed.success) {
                        throw new Error("Invalid input");           
                    }

                    const identifier = parsed.data.identifier?.trim();
                    const password = parsed.data.password;
                
                    const user = await User.findOne({ $or: [{ username: identifier }, 
                                                            {    email: identifier }, 
                                                            {    phone: identifier }] })
                                                            .select(
                                                                    '+security.password ' +
                                                                    '+security.failedAttempts ' +
                                                                    '+lock.lockUntil ' +
                                                                    '+verification'
                                                                    )
                                                            .lean()

                    console.log(user)

                    if (!user || !user.security?.password) throw new Error("Invalid credentials");

                    // check locked account 
                    if (user.lock?.lockUntil && user.lock.lockUntil > Date.now()) {
                            const retryAfter = Math.ceil( (user.lock.lockUntil - Date.now()) / 1000);
                            throw new Error( `Account temporarily locked, try again in ${retryAfter}`, );
                        }           

                    const validPassword = await bcrypt.compare(password, user.security.password);

                    if (!validPassword) {
                        // Update failed attempts
                        const newAttempts = (user.security?.failedAttempts || 0) + 1;
                        await User.updateOne(
                                            { _id: user._id },
                                            {
                                                $inc: { "security.failedAttempts": 1 },
                                                $set: { "lock.lockUntil": calculateLockTime(newAttempts) }
                                            }
                                        );
                                
                        // throw new Error("Invalid credentials")
                        return null
                    }
                    
                    // Check Verification  
                    const requiresVerification = (
                                                ((identifier == user.email) 
                                                    && !(user.verification.isEmailVerified)) ||

                                                ((identifier == user.phone) 
                                                    && !(user.verification.isPhoneVerified)) ||

                                                (identifier == user.username)
                                                    && !(user.verification.isPhoneVerified || user.verification.isEmailVerified)
                                                )
                    if (requiresVerification) throw new Error("Account verification required")

                    // Reset security counters on success
                const loginTransactionSession = await mongoose.startSession();

                loginTransactionSession.startTransaction()
                try {                    
                    await User.updateOne(
                        { _id: user._id },
                        { $set: {
                                    "security.failedAttempts": 0,
                                    "lock.lockUntil": null,
                                    "security.lastLogin": new Date()
                                } 
                        }
                    ).session(loginTransactionSession);

                    const now = Math.floor(Date.now() / 1000);
                    const ACCESS_TOKEN_SECRET = process.env.USER_ACCESS_TOKEN_SECRET;
                    // const REFRESH_TOKEN_SECRET = process.env.USER_REFRESH_TOKEN_SECRET;
                    const ACCESS_TOKEN_EXPIRE_SEC = 60 * Number(process.env.USER_ACCESS_TOKEN_EXPIRE_MINUTES || 15) 
                    const REFRESH_TOKEN_EXPIRE_SEC = 60 * Number(process.env.USER_REFRESH_TOKEN_EXPIRE_MINUTES || 86400)

                    const sessionId = uuidv4();
                    const accessToken = jwt.sign(
                            { 
                                session: sessionId,
                                userId: user._id, 
                                ...(user.email && {  email: user.email }),
                                ...(user.phone && {  phone: user.phone })
                            },
                                ACCESS_TOKEN_SECRET,
                            { expiresIn: ACCESS_TOKEN_EXPIRE_SEC }
                        );
                        const refreshToken = crypto.randomBytes(64).toString('hex');
                        const expiresAt    = new Date(Date.now() + 1000 * REFRESH_TOKEN_EXPIRE_SEC);
                        const { ciphertext: accessTokenCipherText, nonce: accessTokenNonce } = await encrypt(accessToken, 'access_token');
                        const { ciphertext: refreshTokenCipherText, nonce: refreshTokenNonce } = await encrypt(refreshToken, 'refresh_token');
                        const ip =  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                                    req.headers['x-real-ip'] || 
                                    req.socket?.remoteAddress || '';
                        const userAgent = req.headers['user-agent'] || '';


                        const accessTokenExpAt =  new Date((now + ACCESS_TOKEN_EXPIRE_SEC) * 1000)
                        const refreshTokenExpAt = new Date((now + REFRESH_TOKEN_EXPIRE_SEC) * 1000) 
                        
                        const _identifier = user.email == identifier 
                                                ? 'email' 
                                                : user.phone == identifier
                                                    ? 'phone'
                                                    : 'username'

                        
                        const newLoginSession = new Session({
                            _id: sessionId,
                            userId: user._id,
                            provider,
                            accessToken: accessTokenCipherText,
                            accessTokenNonce,
                            accessTokenExpiresAt: accessTokenExpAt,                            
                            refreshToken: refreshTokenCipherText,
                            refreshTokenNonce,
                            refreshTokenExpiresAt: refreshTokenExpAt,
                            ip,
                            userAgent
                        });
                        const savedLoginSession = await newLoginSession.save({ session: loginTransactionSession}
                                                    );
                        
                        


                        const newLoginHistory = new LoginHistory({
                            userId: user._id,
                            sessionId: savedLoginSession._id,
                            provider: `${_identifier}-password`,
                            ip,
                            userAgent
                        })
                        const savedLoginHistory = await newLoginHistory.save(
                                                        // { session }
                                                        { session: loginTransactionSession}
                                                    );
                        
                        await User.updateOne(
                            { _id: user._id },
                            {
                                $push: { 
                                activeSessions: {
                                    $each: [savedLoginSession._id],
                                    $slice: -5 // Keep only last 5 sessions
                                    }
                                }
                            }
                        ).session(loginTransactionSession);
                      
                        
                        await loginTransactionSession.commitTransaction();
                        loginTransactionSession.endSession();

                        return {
                                     email: user.email,
                                  username: user.username,
                                      name: user.name,
                               accessToken: accessToken,
                              refreshToken: refreshToken,
                                      role: user.role,
                                isVerified: Boolean( user.verification?.isEmailVerified ||
                                                     user.verification?.isPhoneVerified  )
                            };
                } catch (error) {
                    loginTransactionSession.abortTransaction()
                    loginTransactionSession.endSession()
                    console.error("Login transaction failed:", error);
                    throw new Error("Login failed")
                }

                // Return user object                    
                } catch (error) {
                    throw new Error("Authentication failed")
                }                
            },
        }),

        


        // CredentialsProvider({
        //     name: 'Phone Login',
        //     id: 'phone-login',
        //     credentials: {
        //         phone: { label: 'Phone', type: 'text', placeholder: 'phone' },
        //         otp: { label: 'otp', type: 'text', placeholder: 'otp' }
        //     },
        //     async authorize(credentials, req) {
        //         console.log('credentials', credentials);
        //         const { phone, otp } = credentials;
                
        //         // Apply phone + otp logic here
        //         // 
        //         // await dbConnect();
        //         // try {
        //         //     const user = await UserModel.findOne({
        //         //         $or: [
        //         //             { email:credentials.identifier},
        //         //             { username: credentials.identifier }
        //         //         ]
        //         //     })
        //         //     if (!user) {
        //         //         throw new Error('Authentication failed');
        //         //     }
        //         //     if(!user.isVerified){
        //         //         throw new Error('pls Verify your email');
        //         //     }
        //         //     const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password)
        //         //     if(!isPasswordCorrect) {
        //         //         throw new Error('Authentication failed');
        //         //     }

        //         // } catch (error) {
        //         //     throw new Error('Error connecting to the database');
        //         // }

        //         // Simulate a user database lookup                            
                
        //         const user = {
        //             id: 1,
        //             name: 'John Doe',
        //             email: ''
        //         };
        //         return user
        //     },
        // }),
        // GoogleProvider({
        //     clientId: process.env.GOOGLE_CLIENT_ID,
        //     clientSecret: process.env.GOOGLE_CLIENT_SECRET
        //   }),
        // AppleProvider({
        //     clientId: process.env.APPLE_ID,
        //     clientSecret: process.env.APPLE_SECRET
        //   }),
        // FacebookProvider({
        //     clientId: process.env.FACEBOOK_CLIENT_ID,
        //     clientSecret: process.env.FACEBOOK_CLIENT_SECRET
        //   }),
        // GitHubProvider({
        //     clientId: process.env.GITHUB_ID,
        //     clientSecret: process.env.GITHUB_SECRET
        //   })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.isVerified = user.isVerified;
            }
            return token;
        },
        async session({ session, token }) {
            console.log(session)
            session.user.id = token.id;
            session.user.isVerified = token.isVerified;
            return session;
        }
    },
    pages: {
        signIn: '/login',
        error: '/auth/error'
    },
    headers: [
        { key: "Access-Control-Allow-Origin", value: "*" },
        { key: "Access-Control-Allow-Credentials", value: "true" }
    ],
    logger:{
        error(code, metadata){
            console.log(code, metadata)
        }
    },
    
    session: {
        strategy: 'jwt',
    },
    basePath: "/api/v1/auth",
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV !== 'production'
};
