import CredentialsProvider from 'next-auth/providers/credentials';
import loginSchema from './loginDTOSchema';
import authDbConnect from '@/app/lib/mongodb/authDbConnect';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { encrypt, decrypt } from '@/lib/encryption/cryptoEncryption';
import { checkLockout, checkVerification, createAccessToken, createRefreshToken, getUserByIdentifier, verifyPassword } from '@/services/auth/user.service';
import { cleanInvalidSessions, createLoginSession } from '@/services/auth/session.service';
import { createLoginHistory } from '@/services/auth/history.service';

// import GoogleProvider from 'next-auth/providers/google';
// import AppleProvider from 'next-auth/providers/apple';
// import FacebookProvider from "next-auth/providers/facebook";
// import GitHubProvider from "next-auth/providers/github";



// function calculateLockTime(failedAttempts) {
//   const MAX_LOGIN_ATTEMPT =  Number(process.env.MAX_LOGIN_ATTEMPT )|| 5;
//   if (failedAttempts < MAX_LOGIN_ATTEMPT) return null;
  
//   const lockMinutes = Math.pow(2, failedAttempts - MAX_LOGIN_ATTEMPT);
//   return new Date(Date.now() + lockMinutes * 60 * 1000);
// }

// async function incrementFailedLogin(user) {
//   const failedAttempts = (user.security?.failedAttempts || 0) + 1;
//   const lockUntil = calculateLockTime(failedAttempts);

//   await User.updateOne(
//     { _id: user._id },
//     {
//       $inc: { "security.failedAttempts": 1 },
//       $set: { "lock.lockUntil": lockUntil }
//     }
//   );
// }

// async function resetFailedLogin(user) {
//   await User.updateOne(
//     { _id: user._id },
//     {
//       $set: {
//         "security.failedAttempts": 0,
//         "lock.lockUntil": null,
//         "security.lastLogin": new Date()
//       }
//     }
//   );
// }

// const generateTokens = async (user) => {
//     // Access Token (JWT)
//     const accessToken = jwt.sign(
//         {
//             userId: user._id,
//             role: user.role,
//             sessionId: crypto.randomBytes(16).toString('hex')
//         },
//         process.env.ACCESS_TOKEN_SECRET,
//         { 
//             expiresIn: '15m', 
//             algorithm: 'RS256' // Asymmetric encryption
//         }
//     );

//     // Refresh Token (Opaque)
//     const refreshToken = crypto.randomBytes(64).toString('hex');
    
//     // Store refresh token in Redis with expiry
//     await redis.set(
//         `refresh_token:${user._id}:${refreshToken}`,
//         'valid',
//         'EX', 7 * 24 * 60 * 60 // 7 days
//     );

//     return { accessToken, refreshToken };
// };


authDbConnect()

export const authOptions = {
    providers: [
        CredentialsProvider({
            name:   'identifier-password-login',
            id:     'identifier-password-login',
            credentials: {
                identifier: { label: 'Username/Email/phone', type: 'text', placeholder: 'Username/Email/Phone' },
                password: { label: 'Password', type: 'password', placeholder: 'password' }
            },

            async authorize(credentials, req) {
                try {
                    const parsed = loginSchema.safeParse(credentials);
                    if (!parsed.success) {
                        // const errorDetails = parsed.error.flatten().fieldErrors;                           
                        // throw new Error(JSON.stringify(errorDetails));
                        throw new Error("Invalid input");        
                    }

                    const { identifier, password, identifierName } = parsed.data;
                    console.log(identifier)

                    const user = await getUserByIdentifier({name: identifierName, value: identifier})

                    console.log(user)

                    if (!user || !user.security?.password) throw new Error("Invalid credentials");

                    checkLockout(user)
                    const isPasswordVerified = await verifyPassword({user, password})

                    if(!isPasswordVerified.status) return null

                    checkVerification({user, identifier})
                    // Reset security counters on success

                    const loginTransactionSession = await mongoose.startSession();
                          loginTransactionSession.startTransaction()
                    try {
                        const ip =  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                                    req.headers['x-real-ip'] || 
                                    req.socket?.remoteAddress || '';
                        const userAgent = req.headers['user-agent'] || '';  
                        const sessionId = uuidv4();  

                        const               ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ;
                        const  ACCESS_TOKEN_EXPIRE_MINUTES = process.env.ACCESS_TOKEN_EXPIRE_MINUTES || 15;
                        const REFRESH_TOKEN_EXPIRE_MINUTES = process.env.REFRESH_TOKEN_EXPIRE_MINUTES  || 86400
                        

                        const {        token: accessToken, 
                                    expireAt: accessTokenExpAt   } = createAccessToken({  user, sessionId, 
                                                                                        secret: ACCESS_TOKEN_SECRET, 
                                                                                        expire: ACCESS_TOKEN_EXPIRE_MINUTES });

                        const {        token: refreshToken,
                                    expireAt: refreshTokenExpAt  } = createRefreshToken({ 
                                                                    expire: REFRESH_TOKEN_EXPIRE_MINUTES  })
                        const {   ciphertext: accessTokenCipherText, 
                                       nonce: accessTokenNonce  } = await encrypt(accessToken, 'access_token');

                        const {   ciphertext: refreshTokenCipherText, 
                                       nonce: refreshTokenNonce } = await encrypt(refreshToken, 'refresh_token');

                        const savedLoginSession = await createLoginSession({       _id: sessionId, 
                                                                                  user, 
                                                                              provider: 'local-'+identifierName,
                                                                           accessToken: accessTokenCipherText, 
                                                                      accessTokenNonce: accessTokenNonce,  
                                                                  accessTokenExpiresAt: accessTokenExpAt,
                                                                          refreshToken: refreshTokenCipherText,
                                                                     refreshTokenNonce: refreshTokenNonce,
                                                                 refreshTokenExpiresAt: refreshTokenExpAt,
                                                                                    ip,
                                                                             userAgent,
                                                                    transactionSession: loginTransactionSession })

                        await createLoginHistory({  userId: user._id, 
                                                 sessionId: savedLoginSession._id, 
                                                  provider: 'local-'+identifierName,
                                                        ip, 
                                                 userAgent,
                                        transactionSession: loginTransactionSession })     

                        await cleanInvalidSessions({        userId: user._id, 
                                                transactionSession: loginTransactionSession})
                            

                        await loginTransactionSession.commitTransaction();
                              loginTransactionSession.endSession();

                        return {    email: user.email,
                                 username: user.username,
                                     name: user.name,
                              accessToken: accessToken,
                             refreshToken: refreshToken,
                                     role: user.role,
                               isVerified: Boolean( user?.isEmailVerified ||
                                                    user?.isPhoneVerified  )
                                };
                    } catch (error) {
                        await loginTransactionSession.abortTransaction()
                              loginTransactionSession.endSession()


                        console.error("Login failed:", error); // remove it in production 
                        throw new Error("Authentication failed")
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
        async jwt(params) {
            console.log(params)
            const {token, user } = params 
            if (user) {
                token.id = user.id;
                token.isVerified = user.isVerified;
            }
            return token;
        },
        async session(params) {
            const { session, token } = params 
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
