import CredentialsProvider from 'next-auth/providers/credentials';
import loginDTOSchema from './loginDTOSchema';
import otpLoginDTOSchema from './otpLoginDTOSchema';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { encrypt } from '@/lib/encryption/cryptoEncryption';
import { checkLockout, checkVerification, createAccessToken, createRefreshToken, getUserByIdentifier, verifyPassword } from '@/services/auth/user.service';
import { cleanInvalidSessions, createLoginSession, getSessionTokenById, updateSessionToken } from '@/services/auth/session.service';
import { createLoginHistory } from '@/services/auth/history.service';
import { loginHistoryModel } from '@/models/auth/LoginHistory';
import { userModel } from '@/models/auth/User';
import { sessionModel } from '@/models/auth/Session';
import GoogleProvider from 'next-auth/providers/google'
import FacebookProvider from 'next-auth/providers/facebook'
import authDbConnect from '@/lib/mongodb/authDbConnect';
import crypto from 'crypto'; 
import cuid from '@bugsnag/cuid';
import tokenRefresh from './utils/tokenRefresh';
import { generateTokenWithEncryption, generateAccessTokenWithEncryption, generateRefreshTokenWithEncryption } from '@/services/auth/user.service';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';


const rateLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 300, // 5 minutes
})


export const authOptions = {
    providers: [
        CredentialsProvider({
            name: 'login',
            id: 'login',
            credentials: {
                 identifier: { label: 'Username/Email/phone', type: 'text',     placeholder: 'Username/Email/Phone' },
                   password: { label: 'Password',             type: 'password', placeholder: 'password' },
                fingerprint: { label: 'fingureprint-id',      type: 'text',     placeholder: '' },
                  userAgent: { label: 'user-agent',           type: 'text',     placeholder: 'Browser' },
                   timezone: { label: 'timezone',             type: 'text',     placeholder: 'Timezone' },
            },

            async authorize(credentials, req) {
                try {
                    // Input validation
                    const parsed = loginDTOSchema.safeParse(credentials);
                    if (!parsed.success) { throw new Error("Invalid input") }
                    const { identifier, password, identifierName, fingerprint, userAgent, timezone } = parsed.data;
                    
                    // Rate Limit
                    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || req.socket?.remoteAddress || '';
                    const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'login' });
                    if (!allowed) return NextResponse.json( { message: `Too many requests. Retry after ${retryAfter}s.` }, { status: 429 });

                    const          auth_db = await authDbConnect();
                    const        UserModel = userModel(auth_db);
                    const     LoginHistory = loginHistoryModel(auth_db)
                    const { phone, email } = { [identifierName]: identifier }
                    if (!email && !phone) throw new Error('At least one identifier (email or phone) is required.');

                    // Find user
                    const user = await UserModel.findOne({ $or: [{ email }, { phone }] })
                                                .select('+_id '                 +
                                                        '+security '            +
                                                        '+security.password '   +
                                                        '+security.failedAttempts '            +
                                                        '+lock '                +
                                                        '+lock.isLocked '       +
                                                        '+lock.lockReason '     +
                                                        '+lock.lockUntil '      +
                                                        '+verification '        +
                                                        '+isEmailVerified '     +                                    
                                                        '+isPhoneVerified '     +
                                                        '+role '                )
                                                .lean();

                    if (!user || !user.security?.password) throw new Error("Invalid credentials");

                    checkLockout(user)
                    
                    const passwordVerification = await verifyPassword({db: auth_db, data:{ user, password } })
                    console.log(passwordVerification?.status)
                
                    if(!passwordVerification?.status) return null
                    checkVerification({user, identifier})
                    // Reset security counters on success
                    const sessionOptions = { readPreference: 'primary',
                                                readConcern: { level: 'local' },
                                               writeConcern: { w: 'majority' }      };
                    const auth_db_session = await auth_db.startSession(sessionOptions);
                          auth_db_session.startTransaction()
                    try {
                        
                        const userAgent = req.headers['user-agent'] || '';  
                        const sessionId = new mongoose.Types.ObjectId();

                        const      MAX_SESSIONS_ALLOWED = Math.abs(Number(process.env.MAX_SESSIONS_ALLOWED)) || 5;                    
                        const IP_ADDRESS_ENCRYPTION_KEY = process.env.IP_ADDRESS_ENCRYPTION_KEY

                        const { accessToken,
                                accessTokenExpAt,
                                accessTokenCipherText  }  = generateAccessTokenWithEncryption({ user, sessionId, userId: user._id, role: user.role})

                        const { refreshToken,
                                refreshTokenExpAt,
                                refreshTokenCipherText }  = generateRefreshTokenWithEncryption()

                        const   ipAddressCipherText = await encrypt({    data: ip,
                                                                    options: { secret: IP_ADDRESS_ENCRYPTION_KEY }     });
                                                                        
                        const Session = sessionModel(auth_db)                              
                        const loggedInSession = await Session.create({
                                                    _id: sessionId,
                                                    userId: user._id,
                                                    provider: 'local-'+identifierName,
                                                    fingerprint,
                                                    accessToken: accessTokenCipherText,
                                                    accessTokenExpiresAt: accessTokenExpAt,
                                                    refreshToken: refreshTokenCipherText,
                                                    refreshTokenExpiresAt: refreshTokenExpAt,
                                                    role: user.role,
                                                    ip: ipAddressCipherText,
                                                    userAgent
                                                }).session(auth_db_session);

                            await UserModel.updateOne( { _id: user._id },
                                                        {   $set: {
                                                                    "security.failedAttempts": 0,
                                                                    "lock.lockUntil": null,
                                                                    "security.lastLogin": new Date()
                                                                    },
                                                            $push: { 
                                                                    activeSessions: {
                                                                        $each: [sessionId],
                                                                        $slice: -MAX_SESSIONS_ALLOWED 
                                                                    }
                                                                }
                                                        },
                                                        { upsert: true, session: auth_db_session }
                                        )
                                                            
                            await LoginHistory.create({   userId: user._id,
                                                                    sessionId,
                                                                    provider: 'local-'+identifierName,
                                                                    fingerprint,
                                                                    ip: ipAddressCipherText,
                                                                    userAgent       })


                        if (MAX_SESSIONS_ALLOWED && user?.activeSessions?.length) {
                                const sessionIds = user?.activeSessions.map(id => id.toString());
                                const allSessionIds = [...new Set([...sessionIds, loggedInSession._id.toString()])];
                                const keepIds = allSessionIds.slice(-MAX_SESSIONS_ALLOWED);
                                const Session = sessionModel(auth_db)  
                                await Session.deleteMany( { userId: user._id, _id: { $nin: keepIds }, }, { session: auth_db_session });                                                             
                            }

                        // if (MAX_SESSIONS_ALLOWED && user?.activeSessions?.length) {
                        //     await cleanInvalidSessions({ activeSessions: user.activeSessions, 
                        //                                          userId: user._id, 
                        //                                currentSessionId: loggedInSession._id.toString(), 
                        //                                    sessionLimit: MAX_SESSIONS_ALLOWED, 
                        //                                              db: auth_db,
                        //                                      db_session: auth_db_session  })
                        //     }

                        await auth_db_session.commitTransaction();

                            return {
                                        email: user.email,
                                        phone: user.phone,
                                    username: user.username,
                                        name: user.name,
                                loginSession: sessionId,
                                accessToken: accessToken,
                            accessTokenExpAt: accessTokenExpAt,
                                refreshToken: refreshToken,
                                    provider: 'local-'+identifierName,
                                        role: user.role,
                                    isVerified: Boolean( user?.isEmailVerified ||
                                                        user?.isPhoneVerified  )
                                };
                    } catch (error) {
                        await auth_db_session.abortTransaction()                    
                        console.error("Login failed:", error);
                        throw new Error("Authentication failed")
                    }finally {
                        auth_db_session.endSession()
                    }

                // Return user object                    
                } catch (error) {
                    console.error("Authentication error:", error);
                    throw new Error(error.message || "Authentication failed");
                }                
            },            
        }),
        CredentialsProvider({
                   name: 'otp-login',
                     id: 'otp-login',
            credentials: {
                      phone: { label: 'phone',                type: 'text',     placeholder: 'Phone' },
                        otp: { label: 'otp',                  type: 'password', placeholder: 'otp' },
                fingerprint: { label: 'fingureprint-id',      type: 'text',     placeholder: 'Fingureprint' },
                  userAgent: { label: 'user-agent',           type: 'text',     placeholder: 'Browser' },
                   timezone: { label: 'timezone',             type: 'text',     placeholder: 'Timezone' },
                },
            async authorize(credentials, req) {
                try {
                    // Input validations
                    const parsed = otpLoginDTOSchema.safeParse(credentials);
                    if (!parsed.success) throw new Error("Invalid input") 
                    
                    // Rate Limit
                    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || req.socket?.remoteAddress || '';
                    const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'login' });
                    if (!allowed) return NextResponse.json( { message: `Too many requests. Retry after ${retryAfter}s.` }, { status: 429 });

                    // Database connection 
                    const   auth_db = await authDbConnect();
                    const    UserModel = userModel(auth_db);
                    const LoginHistory = loginHistoryModel(auth_db) 
                    
                    const { phone, otp, fingerprint, userAgent, timezone } = parsed.data;
                    const user = await UserModel.findOne({ phone })
                                                .select('+_id '                                     +
                                                        '+security '                                +
                                                        '+security.password '                       +
                                                        '+security.failedAttempts '                 +
                                                        '+lock '                                    +
                                                        '+lock.isLocked '                           +
                                                        '+lock.lockReason '                         +
                                                        '+lock.lockUntil '                          +
                                                        '+verification '                            +
                                                        '+verification.phoneVerificationOTP '       +
                                                        '+verification.phoneVerificationOTPExpiry ' +
                                                        '+verification.otpAttempts '                +
                                                        '+isEmailVerified '                         +                                    
                                                        '+isPhoneVerified '                         +
                                                        '+role '             )
                                                .lean();

                    if (!user || !user.verification?.phoneVerificationOTP || !user.verification?.phoneVerificationOTPExpiry) 
                        throw new Error("Invalid credentials");

                    checkLockout(user)

                    // Otp validation
                    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
                    const valid = user.verification.phoneVerificationOTP === hashedOtp && user.verification.phoneVerificationOTPExpiry > Date.now()
                    
                    if (!valid) {  
                        const         MAX_OTP_ATTEMPT = parseInt(process.env.MAX_OTP_ATTEMPT, 10) || 5
                        user.verification.otpAttempts = (user.verification.otpAttempts || 0) + 1;
                        const       USER_LOCK_MINUTES = parseInt(process.env.USER_LOCK_MINUTES, 10) || 15

                        const updateOps = { $inc:   { 'verification.otpAttempts'               : 1   }, 
                                            $unset: { 'verification.phoneVerificationOTP'      : "",
                                                      'verification.phoneVerificationOTPExpiry': "", } };                        

                        if (user.verification.otpAttempts && user.verification.otpAttempts >= MAX_OTP_ATTEMPT) 
                                updateOps.$set = {    'lock.isLocked': true,
                                                    'lock.lockReason': 'maximum phone otp exceed',
                                                     'lock.lockUntil': new Date(Date.now() + USER_LOCK_MINUTES * 60 * 1000)  };
                        await UserModel.updateOne({ _id: user._id }, updateOps);
                        return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
                    }

                    const sessionOptions = { readPreference: 'primary',
                                                readConcern: { level: 'local' },
                                               writeConcern: { w: 'majority' } };
                    
                    const auth_db_session = await auth_db.startSession(sessionOptions);
                          auth_db_session.startTransaction()
                    try {                                        
                        const userAgent = req.headers['user-agent'] || '';
                        const sessionId = new mongoose.Types.ObjectId();

                        const MAX_SESSIONS_ALLOWED = Math.abs(parseInt(process.env.MAX_SESSIONS_ALLOWED, 10)) || 5;                        
                        
                        const { accessToken,
                                accessTokenExpAt,
                                accessTokenCipherText   }  = generateAccessTokenWithEncryption({ user, sessionId})

                        const { refreshToken,
                                refreshTokenExpAt,
                                refreshTokenCipherText  }  = generateRefreshTokenWithEncryption()
                        

                        const Session = sessionModel(auth_db) 
                        const savedLoginSession = await Session.create({
                                                _id: sessionId,
                                                userId: user._id,
                                                provider: 'local-'+identifierName,
                                                fingerprint,
                                                accessToken: accessTokenCipherText,
                                                accessTokenExpiresAt: accessTokenExpAt,
                                                refreshToken: refreshTokenCipherText,
                                                refreshTokenExpiresAt: refreshTokenExpAt,
                                                role: user.role,
                                                ip: ipAddressCipherText,
                                                userAgent
                                            }).session(auth_db_session);

                         await UserModel.updateOne( {    _id: user._id },
                                                    {   $set: {          "isPhoneVerified": true,
                                                                 "security.failedAttempts": 0,
                                                                      "security.lastLogin": new Date(),
                                                                "verification.otpAttempts": 0       },
                                                        $unset: {   'verification.phoneVerificationOTP': "",
                                                              'verification.phoneVerificationOTPExpiry': "",
                                                                                                   lock: "" },
                                                        $push: { 
                                                                activeSessions: {
                                                                    $each: [sessionId],
                                                                    $slice: -MAX_SESSIONS_ALLOWED 
                                                                }
                                                            }
                                                    },
                                                    { upsert: true, session: auth_db_session }
                                    )

                        await LoginHistory.create({   userId: user._id,
                                                                sessionId,
                                                                provider: 'local-'+identifierName,
                                                                fingerprint,
                                                                ip: ipAddressCipherText,
                                                                userAgent       })
                        if (MAX_SESSIONS_ALLOWED && user?.activeSessions?.length) {
                            // const sessionsToKeep = user.activeSessions.slice(-MAX_SESSIONS_ALLOWED)
                            //                                           .map(id => id.toString());
                            // if (sessionsToKeep.length >= MAX_SESSIONS_ALLOWED) 
                            //     await Session.deleteMany({ userId: user._id, _id: { $nin: [...sessionsToKeep, sessionId] }});
                            const sessionIds = user?.activeSessions.map(id => id.toString());
                            const allSessionIds = [...new Set([...sessionIds, savedLoginSession._id.toString()])];
                            const keepIds = allSessionIds.slice(-MAX_SESSIONS_ALLOWED);
                            const Session = sessionModel(auth_db)  
                            await Session.deleteMany( { userId: user._id, _id: { $nin: keepIds }, }, { session: auth_db_session });                                                             
                        }

                        await auth_db_session.commitTransaction();

                        return {       email: user.email,
                                       phone: user.phone,
                                    username: user.username,
                                        name: user.name,
                                loginSession: sessionId,
                                 accessToken: accessToken,
                            accessTokenExpAt: accessTokenExpAt,
                                refreshToken: refreshToken,
                                    provider: 'local-'+identifierName,
                                        role: user.role,
                                  isVerified: Boolean( user?.isEmailVerified ||
                                                       user?.isPhoneVerified  )
                                };
                    } catch (error) {
                        await auth_db_session.abortTransaction()                    
                        console.error("Login failed:", error);
                        throw new Error("Authentication failed")
                    }finally {
                        auth_db_session.endSession()
                    }
          
                } catch (error) {
                    console.error("Authentication error:", error);
                    throw new Error(error.message || "Authentication failed");
                }                
            },
        }),
        GoogleProvider({
                 clientId: process.env.GOOGLE_CLIENT_ID,
             clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
                            params: {
                                       prompt: "consent",
                                  access_type: "offline",
                                response_type: "code",
                                        scope: 'openid email profile' // Request necessary user data
                            }
                        },
            profile(profile) {
                return { id: profile.sub,
                       name: profile.name,
                      email: profile.email,
                      image: profile.picture,
                   verified: profile.email_verified }
                }
        }),
        FacebookProvider({
                 clientId: process.env.FACEBOOK_CLIENT_ID,
             clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
            authorization: {
                params: {
                           prompt: "consent",
                      access_type: "offline",
                    response_type: "code",
                            scope: 'email,public_profile' }
            },
            profile(profile) {
                return {
                    id: profile.id,
                    name: profile.name,
                    email: profile.email,
                    image: profile.picture?.data?.url,
                    verified: true // Facebook doesn't provide email_verified
                }
            }
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile, req }) {
            if (account.provider === 'google' || account.provider === 'facebook') {
                const sessionOptions = { readPreference: 'primary',
                                            readConcern: { level: 'local' },
                                           writeConcern: { w: 'majority' } };

                const         auth_db = await authDbConnect();
                const       UserModel = userModel(auth_db);
                const    SessionModel = sessionModel(auth_db);
                const auth_db_session = await auth_db.startSession(sessionOptions);
                await auth_db_session.startTransaction();

            try {
                const existingUser = await UserModel.findOne({ $or: [ {                            email: profile.email }, 
                                                                      { [`oauth.${account.provider}.id`]: profile.id } ]})
                                                    .select('+_id +role +activeSessions')                  
                                                    .lean();

                let userId;
                let userRole = ['user'];

                if (!existingUser) {
                    const newUser = { email: profile.email,
                                       name: profile.name || '',
                                   username: profile.email?.split('@')[0] || cuid(),
                                      oauth: { [account.provider]: { id: profile.id,
                                                            accessToken: account.access_token,
                                                           refreshToken: account.refresh_token,
                                                         tokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null }  },
                            isEmailVerified: true,
                                       role: ['user'],
                                   security: { password: null } };

                    const createdUser = await UserModel.create([newUser], { session: auth_db_session });
                               userId = createdUser[0]._id;
                } else {
                    userId = existingUser._id;
                  userRole = existingUser.role;
                }
                await UserModel.updateOne( { _id: userId },
                                           { $set: { 
                                                    [`oauth.${account.provider}`]: {
                                                                                      id: profile.id,
                                                                             accessToken: account.access_token,
                                                                            refreshToken: account.refresh_token,
                                                                          tokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null }
                                                    }
                                            },
                                            { session: auth_db_session }
                                        );

                const        ip = req?.headers['x-forwarded-for']?.split(',')[0]?.trim() || req?.headers['x-real-ip'] || req?.socket?.remoteAddress || '';
                const userAgent = req?.headers['user-agent'] || '';
                const sessionId = new mongoose.Types.ObjectId();

                const         MAX_SESSIONS_ALLOWED = Math.abs(Number(process.env.MAX_SESSIONS_ALLOWED)) || 5;
                const    IP_ADDRESS_ENCRYPTION_KEY = process.env.IP_ADDRESS_ENCRYPTION_KEY              || '';

                const { accessToken,
                        accessTokenExpAt,
                        accessTokenCipherText   }  = generateAccessTokenWithEncryption({ user, sessionId})

                const { refreshToken,
                        refreshTokenExpAt,
                        refreshTokenCipherText  }  = generateRefreshTokenWithEncryption()



                const ipAddressCipherText = await encrypt({ data: ip, options: { secret: IP_ADDRESS_ENCRYPTION_KEY } });

                const loginSession = await SessionModel.create([{ _id: sessionId,
                                                               userId,
                                                             provider: account.provider,
                                                          accessToken: accessTokenCipherText,
                                                 accessTokenExpiresAt: accessTokenExpAt,
                                                         refreshToken: refreshTokenCipherText,
                                                refreshTokenExpiresAt: refreshTokenExpAt,
                                                          fingerprint: null,
                                                                   ip: ipAddressCipherText,
                                                            userAgent,
                                                                 role: userRole,
                                                         providerData: {       provider: account.provider,
                                                                         providerUserId: profile.id,
                                                                    providerAccessToken: account.access_token,
                                                                   providerRefreshToken: account.refresh_token,
                                                                 providerTokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null    }
                                                        }], { session: auth_db_session });

                const LoginHistory = loginHistoryModel(auth_db)                                     
                await LoginHistory.create({   userId:user._id,
                                            sessionId: loginSession._id,
                                            provider: account.provider,
                                            fingerprint: null,
                                            ip: ipAddressCipherText,
                                            userAgent       }).session(auth_db_session) 

                if (MAX_SESSIONS_ALLOWED && existingUser?.activeSessions?.length) {
                    const sessionIds = existingUser?.activeSessions.map(id => id.toString());
                    const allSessionIds = [...new Set([...sessionIds, sessionId.toString()])];
                    const keepIds = allSessionIds.slice(-MAX_SESSIONS_ALLOWED);
                    const Session = sessionModel(auth_db)  
                    await Session.deleteMany( { userId, _id: { $nin: keepIds }, },
                        { session: auth_db_session });
                }

                await auth_db_session.commitTransaction();
                    user.loginSession = sessionId;
                        user.provider = account.provider;
                     user.accessToken = accessToken;
                user.accessTokenExpAt = accessTokenExpAt;
                    user.refreshToken = refreshToken;
                            user.role = userRole;
                            user.name = profile.name;
                        user.username = profile.email?.split('@')[0] || profile.id;
                           user.email = profile.email;
                      user.isVerified = true;

                return true;
            } catch (err) {
                await auth_db_session.abortTransaction();
                console.error("OAuth signIn error:", err);
                return false;
            } finally {
                auth_db_session.endSession();
            }
            }

            return true; // fallback for Credentials provider
        },
        async jwt(params) {
            const { token, user, account, profile } = params
            // console.log(token)
            if (user) {
                token.accessToken       = user.accessToken;
                token.accessTokenExpAt  = user.accessTokenExpAt;
                token.refreshToken      = user.refreshToken;
                token.loginSession      = user.loginSession;
                token.username          = user?.username        || ''; /* optional fields */
                token.name              = user?.name            || '';
                token.email             = user?.email           || '';
                token.phone             = user?.phone           || '';
                token.role              = user.role             || '';
                token.isVerified        = user.isVerified || false;
                token.provider          = user.provider;
            }

            const accessTokenExpire_ms  = new Date(token.accessTokenExpAt).getTime()

            if(Date.now() < accessTokenExpire_ms)
                return token;            

            const          ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ;
            const REFRESH_TOKEN_ENCRYPTION_KEY = process.env.REFRESH_TOKEN_ENCRYPTION_KEY || ''
            const  ACCESS_TOKEN_EXPIRE_MINUTES = Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES  || 15);
            const REFRESH_TOKEN_EXPIRE_MINUTES = Number(process.env.REFRESH_TOKEN_EXPIRE_MINUTES || 86400)  
            
            if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_ENCRYPTION_KEY)                 
                return null;

            try {
                const newTokens  = await tokenRefresh({                    token, 
                                                               accessTokenSecret: ACCESS_TOKEN_SECRET, 
                                                                 refreshTokenKey: REFRESH_TOKEN_ENCRYPTION_KEY,
                                                               accessTokenExpire: ACCESS_TOKEN_EXPIRE_MINUTES,
                                                              refreshTokenExpire: REFRESH_TOKEN_EXPIRE_MINUTES
                                                            })
                if(!newTokens) return null
                        
              token.accessToken      = newTokens.accessToken;
              token.accessTokenExpAt = newTokens.accessTokenExpAt;
              token.refreshToken     = newTokens.refreshToken;
              return token 
            } catch (error) {
              return null
            }
        },
        async session(params) {
            const { session, token } = params
            // console.log(session)
            // session.user.id = token.id;
            // session.user.isVerified = token.isVerified;

            if (token) {
                session.user = {        
                      name: token.name,
                     email: token.email,
                  username: token.username,
                     phone: token.phone,
                      role: token.role,
                isVerified: token.isVerified,
                  provider: token.provider,
                };                
                // session.accessToken = token.accessToken;
                // session.accessTokenExpAt = token.accessTokenExpAt;
                // session.refreshToken = token.refreshToken;
            }
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







