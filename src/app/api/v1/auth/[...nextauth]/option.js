import CredentialsProvider from 'next-auth/providers/credentials';
import loginDTOSchema from './loginDTOSchema';
import otpLoginDTOSchema from './otpLoginDTOSchema';
import mongoose from 'mongoose';
import { encrypt } from '@/lib/encryption/cryptoEncryption';
// import { checkLockout, checkVerification } from '@/services/auth/user.service';
import { loginHistoryModel } from '@/models/auth/LoginHistory';
import { userModel } from '@/models/auth/User';
import { sessionModel } from '@/models/auth/Session';
import GoogleProvider from 'next-auth/providers/google'
import FacebookProvider from 'next-auth/providers/facebook'
import authDbConnect from '@/lib/mongodb/authDbConnect';
import crypto from 'crypto'; 
import cuid from '@bugsnag/cuid';
import tokenRefresh from '../utils/tokenRefresh';
// import { generateAccessTokenWithEncryption, generateRefreshTokenWithEncryption } from '@/services/auth/user.service';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import config from '../../../../../../config';
import getUserByIdentifier from '@/services/user/getUserByIdentifier';
import verifyPassword from '@/services/user/verifyPassword';
import generateToken from '@/lib/generateToken';
import { setSession } from '@/lib/redis/helpers/session';
import moment from 'moment-timezone';
import getUserByPhone from '@/services/user/getUserByPhone';
import getUserByEmail from '@/services/user/getUserByEmail';
import handleSuccessfulLogin from '@/services/user/handleSuccessfulLogin';



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
                    const { allowed, retryAfter, remaining } = await applyRateLimit({ key: ip, 
                                                                         scope: 'login' });
                    if (!allowed) throw new Error("Invalid request");

                    if (!['email', 'phone', 'username'].includes(identifierName)) 
                        throw new Error("Unsupported identifier type");

                    const { phone, email, username } = { [identifierName]: identifier }
                    if (!email && !phone && !username) 
                        throw new Error('At least one identifier (email or phone) is required.');
                            // '+verification', 
                            // '+verification.otp', 
                            // '+verification.otpExpiry', 
                            // '+verification.otpAttempts',
                    const requiredFields = ['+security', 
                                            '+security.password', 
                                            '+security.failedAttempts',
                                            
                                            '+lock', 
                                            '+lock.isLocked', 
                                            '+lock.lockReason', 
                                            '+lock.lockUntil',

                                            '+isEmailVerified', '+isPhoneVerified',
                                            '+timezone', '+activeSessions', '+email', '+name', '+phone', '+username', '+avatar', 'role', '+theme', '+language', '+currency']

                    // Find user
                    const user = await getUserByIdentifier({ identifiers:{ [identifierName]: identifier }, 
                                                                  fields:  requiredFields })
                    if (!user || !user.security?.password) 
                        throw new Error("Invalid credentials");

                    if (user.lock?.lockUntil && user.lock.lockUntil > Date.now()) {
                        const retryAfter = Math.ceil((user.lock.lockUntil - Date.now()) / 1000);
                        throw new Error(`Account temporarily locked, try again in ${retryAfter}`);
                    }
                    
                    const passwordVerification = await verifyPassword({ payload:{ user, password } })
                    if(!passwordVerification?.status) return null
                    
                    const notVerified = (identifierName === 'email' && !user.isEmailVerified) ||
                                        (identifierName === 'phone' && !user.isPhoneVerified) ||
                                        (identifierName === 'username' && !(user.isEmailVerified || user.isPhoneVerified));
                    if (notVerified) throw new Error("Not verified...");

                    const        auth_db = await authDbConnect();
                    const sessionOptions = { readPreference: 'primary',
                                                readConcern: { level: 'local' },
                                                writeConcern: { w: 'majority',j: true }};
                    const auth_db_session = await auth_db.startSession(sessionOptions);
                          auth_db_session.startTransaction()
                    try {
                        const { accessToken,
                                refreshToken,
                                sessionId,
                                accessTokenExpiry,
                                user: updateUser } = await handleSuccessfulLogin({       user, 
                                                                                    loginType: 'password', 
                                                                                     provider: 'local-'+identifierName, 
                                                                               identifierName, 
                                                                                           ip, 
                                                                                    userAgent, 
                                                                                     timezone, 
                                                                                  fingerprint,
                                                                                      session: auth_db_session,
                                                                                 oauthProfile: null })
                        await auth_db_session.commitTransaction();
                        return { ...(user.email     && {    email: user.email     }),
                                 ...(user.phone     && {    phone: user.phone     }),
                                 ...(user.name      && {     name: user.name      }),                                     
                                 ...(user.avatar    && {   avatar: user.avatar    }),                                    
                                     sub: user.referenceId,
                                 session: sessionId,
                             accessToken: accessToken,
                       accessTokenExpiry,
                            refreshToken: refreshToken,
                                provider: 'local-'+identifierName,
                                    role: user.role,
                              isVerified: Boolean(user?.isEmailVerified ||
                                                    user?.isPhoneVerified),
                                  locals: { ...(updateUser.timezone  && { timezone: updateUser.timezone  }),
                                            ...(user.theme           && {    theme: user.theme     }),
                                            ...(user.language        && { language: user.language  }),
                                            ...(user.currency        && { currency: user.currency  })   }
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
                    const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'otp-login' });
                    if (!allowed) return null;
                    // Database connection 
                    
                    
                    const { phone, otp, fingerprint, userAgent, timezone } = parsed.data;
                    const requiredFields = ['+security', 
                                            '+security.password', 
                                            '+security.failedAttempts',
                                            
                                            '+lock', 
                                            '+lock.isLocked', 
                                            '+lock.lockReason', 
                                            '+lock.lockUntil',
                                            
                                            '+verification', 
                                            '+verification.otp', 
                                            '+verification.otpExpiry', 
                                            '+verification.otpAttempts',
                                            
                                            '+isEmailVerified', '+isPhoneVerified',
                                            '+timezone', '+activeSessions', '+email', '+name', '+phone', '+username', '+avatar', 'role', '+theme', '+language', '+currency']
                    const user = await getUserByPhone({ phone, fields: requiredFields })

                    if (!user || !user.verification?.phoneVerificationOTP || !user.verification?.phoneVerificationOTPExpiry) 
                        throw new Error("Invalid credentials");

                    if (user.lock?.lockUntil && user.lock.lockUntil > Date.now()) {
                        const retryAfter = Math.ceil((user.lock.lockUntil - Date.now()) / 1000);
                        throw new Error(`Account temporarily locked, try again in ${retryAfter}`);
                    }

                    // Otp validation
                    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
                    const valid = (user.verification.otp === hashedOtp) && (user.verification.otpExpiry > Date.now())
                    
                    const      auth_db = await authDbConnect();
                    const         User = userModel(auth_db);

                    if (!valid) {  
                        user.verification.otpAttempts = (user.verification.otpAttempts || 0) + 1;

                        const updateOps = { $inc:   { 'verification.otpAttempts' : 1   }, 
                                            $unset: { 'verification.otp'         : "",
                                                      'verification.otpExpiry'   : "", } };  

                        if (user.verification.otpAttempts && user.verification.otpAttempts >= config.maxOtpAttempt) 
                                updateOps.$set = {    'lock.isLocked': true,
                                                    'lock.lockReason': 'maximum phone otp exceed',
                                                     'lock.lockUntil': new Date(Date.now() + config.userLockMinutes * 60 * 1000)  };

                        await User.updateOne({ _id: user._id }, updateOps);
                        return null;
                    }

                    const sessionOptions = { readPreference: 'primary',
                                                readConcern: { level: 'local' },
                                               writeConcern: { w: 'majority' } };
                    
                    const auth_db_session = await auth_db.startSession(sessionOptions);
                          auth_db_session.startTransaction()
                    try {                                        

                        const { accessToken,
                                refreshToken,
                                sessionId,
                                accessTokenExpiry,
                                user: updateUser } = await handleSuccessfulLogin({       user, 
                                                                                    loginType: 'otp', 
                                                                                     provider: 'local-phone', 
                                                                               identifierName: 'phone', 
                                                                                           ip, 
                                                                                    userAgent, 
                                                                                     timezone, 
                                                                                  fingerprint,
                                                                                      session: auth_db_session,
                                                                                 oauthProfile: null })
                        await auth_db_session.commitTransaction();


                        return { ...(user.email     && {    email: user.email     }),
                                 ...(user.phone     && {    phone: user.phone     }),
                                 ...(user.name      && {     name: user.name      }),                                     
                                 ...(user.avatar    && {   avatar: user.avatar    }),                                    
                                     sub: user.referenceId,
                                 session: sessionId,
                             accessToken: accessToken,
                       accessTokenExpiry,
                            refreshToken: refreshToken,
                                provider: 'local-phone',
                                    role: user.role,
                              isVerified: true,
                                  locals: { ...(updateUser.timezone && { timezone: updateUser.timezone  }),
                                            ...(user.theme          && {    theme: user.theme           }),
                                            ...(user.language       && { language: user.language        }),
                                            ...(user.currency       && { currency: user.currency        })   }
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
                 clientId: config.googleClientId,
             clientSecret: config.googleClientSecret,
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
                 clientId: config.facebookClientId,
             clientSecret: config.facebookClientSecret,
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


    // sample signIn 
    // signIn({ user, account, profile, email, credentials }, req)

    callbacks: {
        async signIn({ user, account, profile }, req) {

            const timezone = req?.headers['x-timezone'] || null;
            const fingerprint = req?.headers['x-fingerprint'] || null;
            if (account.provider === 'google' || account.provider === 'facebook') {
                // Rate Limit
                const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || req.socket?.remoteAddress || '';
                const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'login' });
                if (!allowed) return null;                
                const userAgent = req?.headers['user-agent'] || '';

                const sessionOptions = { readPreference: 'primary',
                                            readConcern: { level: 'local' },
                                           writeConcern: { w: 'majority' } };

                const         auth_db = await authDbConnect();
                const            User = userModel(auth_db);
                const auth_db_session = await auth_db.startSession(sessionOptions);
                await auth_db_session.startTransaction();

                try {
                    let _user = null;
                        _user = await getUserByEmail({ email: profile.email, 
                                                    fields: ['lock', 'verification', 'oauth', '+activeSessions', '+email', '+name', '+phone', '+username', '+avatar', 'role', '+theme', '+language', '+currency'] })

                    if (!_user) {
                        // create a new user
                        const payload = { email: profile.email,
                                           name: profile.name || '',
                                         avatar: account.provider === 'google' 
                                                            ? profile.picture 
                                                            : account.provider === 'facebook' 
                                                                ? profile.picture.data.url
                                                                : null,
                                       username: profile.email?.split('@')[0] || cuid(),
                                          oauth: { [account.provider]: { id: account.provider === 'google' ? profile.sub : profile.id,
                                                                accessToken: account.access_token,
                                                               refreshToken: account.refresh_token,
                                                             tokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null }  },
                             isEmailVerified: true,
                                        role: ['user'] };

                        const query = new User(payload);
                        _user = await query.save({ session: auth_db_session });
                    } 
                    if(!_user) throw new Error('Something went wrong...');
                    if (_user.lock?.lockUntil && _user.lock.lockUntil > Date.now()) {
                            const retryAfter = Math.ceil((_user.lock.lockUntil - Date.now()) / 1000);
                            throw new Error(`Account temporarily locked, try again in ${retryAfter}`);
                        }

                    // check unmatch with previous same provider login
                    // not for new user only for user previously login with same provider 
                    if ((account.provider === 'google' && _user.oauth?.google?.id && _user.oauth.google.id !== profile.sub) ||
                        (account.provider === 'facebook' && _user.oauth?.facebook?.id && _user.oauth.facebook.id !== profile.id)) {
                    console.log(`OAuth ID mismatch for user ${_user._id}`);
                    return false;
                    }
                    const { accessToken,
                           refreshToken,
                              sessionId,
                      accessTokenExpiry,
                                   user: updateUser } = await handleSuccessfulLogin({    user: _user, 
                                                                                    loginType: 'oauth', 
                                                                                     provider: account.provider, 
                                                                               identifierName: 'email', 
                                                                                           ip, 
                                                                                    userAgent, 
                                                                                     timezone, 
                                                                                  fingerprint,
                                                                                      session: auth_db_session,
                                                                                 oauthProfile: account })




                    await auth_db_session.commitTransaction();
                                 user.sub = _user.referenceId;
                             user.session = sessionId;
                            user.provider = account.provider;
                         user.accessToken = accessToken;
                   user.accessTokenExpiry = accessTokenExpiry;
                        user.refreshToken = refreshToken;
                                user.role = updateUser.role;
                                user.name = profile.name || '';
                            user.username = profile.email?.split('@')[0] || profile.id;
                               user.email = profile.email;
                               user.phone = _user.phone || '';
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

            return account.provider === 'credentials';
        },
        async jwt(params) {
            const { token, user, account, profile } = params
            // console.log(token)
            if (user) {
                token.sub               = user.sub;
                token.accessToken       = user.accessToken;
                token.accessTokenExpiry = user.accessTokenExpiry;
                token.refreshToken      = user.refreshToken;
                token.session           = user.session;
                token.username          = user?.username        || ''; /* optional fields */
                token.name              = user?.name            || '';
                token.email             = user?.email           || '';
                token.phone             = user?.phone           || '';
                token.role              = user.role             || '';
                token.isVerified        = user.isVerified       || false;
                token.provider          = user.provider;
                token.locals            = user.locals || {};
            }

            const accessTokenExpire_ms  = new Date(token.accessTokenExpAt).getTime()

            if(Date.now() < token.accessTokenExpiry)
                return token;   
                 

            try {
                const newTokens  = await tokenRefresh({ token })
                if(!newTokens) return null
                token.accessToken      = newTokens.accessToken;
                token.accessTokenExpiry = newTokens.accessTokenExpiry;
                token.refreshToken     = newTokens.refreshToken;
                return token 
            } catch (error) {
                console.error("Token refresh failed:", error);
                return null
            }
        },
        async session(params) {
            const { session, token } = params

            if (token) {
                session.user = {        
                      name: token.name,
                     email: token.email,
                  username: token.username,
                     phone: token.phone,
                      role: token.role,
                isVerified: token.isVerified,
                  provider: token.provider,
                     local: token.local || {}
                };                
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
    secret: config.nextAuthSecret,
    debug: process.env.NODE_ENV !== 'production'
};




// code from facebook/google provider login 
// const    sessionId = new mongoose.Types.ObjectId();                  
// const LoginHistory = loginHistoryModel(auth_db)
// const      Session = sessionModel(auth_db)

// const { accessToken,
//         refreshToken,
//         tokenId,
//         accessTokenExpiry,
//         refreshTokenExpiry,
//         refreshTokenCipherText } = await generateToken({ user, sessionId });

// const   ipAddressCipherText = await encrypt({    data: ip,
//                                               options: { secret: config.ipAddressEncryptionKey }     });

// const userUpdate = { $set: {
//                             "security.failedAttempts": 0,
//                                      "lock.lockUntil": null,
//                                  "security.lastLogin": new Date(),
//                                     "isPhoneVerified": true,
//                             ...(timezone && !user.timezone && (moment.tz.zone(timezone) !== null) && { timezone })
//                         },
//                      $push: {
//                             activeSessions: {
//                                                 $each: [sessionId],
//                                                 $slice: -config.maxSessionsAllowed
//                                             }
//                         }
//                     };
// const sessionPayload = {      _id: sessionId,
//                            userId: user._id,
//                          provider: 'local-phone',
//                       fingerprint,
//                           tokenId: crypto.createHash('sha256').update(tokenId).digest('hex'),
//                 accessTokenExpiry,
//                      refreshToken: refreshTokenCipherText,
//                refreshTokenExpiry,
//                              role: user.role,
//                                ip: ipAddressCipherText,
//                          userAgent,
//                           timezone               }
            
// const loginHistoryPayload = { userId: user._id,
//                            sessionId,
//                             provider: 'local-phone',
//                          fingerprint,
//                                   ip: ipAddressCipherText,
//                             userAgent }
// const promiseArray = [  setSession({ sessionId,
//                                        tokenId,
//                                        payload: { sub: user.referenceId, 
//                                                  role: user.role         }}),

//                         Session.create([sessionPayload], 
//                                   { session: auth_db_session }),

//                            User.updateOne({ _id: user._id },
//                                      userUpdate,
//                                       { session: auth_db_session }),

//                    LoginHistory.create([loginHistoryPayload],  
//                                        { session: auth_db_session })]                                                       
// await Promise.all(promiseArray);

// /** *********************Temporary Execution of function********************* **/
// /**   This operation need transfer into corn job/ this will done in future    **/
// const updatedUser = await User.findOne({ _id: user._id }, { activeSessions: 1 });
// await Session.deleteMany({ userId: user._id,
//                             _id: { $nin: updatedUser.activeSessions }
//                         }, { session: auth_db_session });
// /** ########################################################################## **/








                    // code from facebook/google provider login 
                    // const sessionId = new mongoose.Types.ObjectId();
                    // const        Session = sessionModel(auth_db)
                    // const   LoginHistory = loginHistoryModel(auth_db)
                    // const { accessToken,
                    //         refreshToken,
                    //         tokenId,
                    //         accessTokenExpiry,
                    //         refreshTokenExpiry,
                    //         refreshTokenCipherText } = await generateToken({ user, sessionId });
                    // const   ipAddressCipherText = await encrypt({    data: ip,
                    //                                             options: { secret: config.ipAddressEncryptionKey }});

                    // const userUpdate = { $set: { "security.failedAttempts": 0,
                    //                                  "lock.lockUntil"     : null,
                    //                              "security.lastLogin"     : new Date(),
                    //                             ...(account.provider && ((account.provider === 'google' && !_user.oauth.google) || (account.provider === 'facebook' && !_user.oauth.facebook))
                    //                                                     ({
                    //                                                         [`oauth.${account.provider}`]: {
                    //                                                                                                         id: account.provider === 'google' ? profile.sub : profile.id,
                    //                                                                                                accessToken: account.access_token,
                    //                                                                                               refreshToken: account.refresh_token,
                    //                                                                                             tokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null
                    //                                                                                         }
                    //                                                     }))
                    //                             },
                    //                     $push: { activeSessions: {
                    //                                                 $each: [sessionId],
                    //                                                $slice: -config.maxSessionsAllowed
                    //                                             }
                    //                             }
                    //                     };

                    // const sessionPayload = {   _id: sessionId,
                    //                         userId: _user._id,
                    //                       provider: account.provider,
                    //                        tokenId: crypto.createHash('sha256').update(tokenId).digest('hex'),
                    //              accessTokenExpiry,
                    //                   refreshToken: refreshTokenCipherText,
                    //             refreshTokenExpiry,
                    //                           role: _user.role,
                    //                             ip: ipAddressCipherText,
                    //                      userAgent,
                    //                       timezone,               }

                    // const loginHistoryPayload = { userId: _user._id,
                    //                            sessionId,
                    //                             provider: account.provider,
                    //                                   ip: ipAddressCipherText,
                    //                            userAgent                        }

                    // const promiseArray = [  setSession({ sessionId,
                    //                                        tokenId,
                    //                                             payload: { sub: _user.referenceId, 
                    //                                                       role: _user.role         }}),

                    //                         Session.create([sessionPayload], 
                    //                                         { session: auth_db_session }),

                    //                         User.updateOne({ _id: _user._id },
                    //                                             userUpdate,
                    //                                         { session: auth_db_session }),

                    //                 LoginHistory.create([loginHistoryPayload],  
                    //                                     { session: auth_db_session })]
                    //                         await Promise.all(promiseArray);

                    // /** *********************Temporary Execution of function********************* **/
                    // /**   This operation need transfer into corn job/ this will done in future    **/
                    // const updatedUser = await User.findOne({ _id: _user._id }, { activeSessions: 1 });
                    // await Session.deleteMany({ userId: _user._id,
                    //                             _id: { $nin: updatedUser.activeSessions }
                    //                         }, { session: auth_db_session });
                    // /** ########################################################################## **/



















// Code from credential login 
// const      sessionId = new mongoose.Types.ObjectId();
// const        Session = sessionModel(auth_db)
// const   LoginHistory = loginHistoryModel(auth_db)
// const           User = userModel(auth_db)

// const { accessToken,
//         refreshToken,
//         tokenId,
//         accessTokenExpiry,
//         refreshTokenExpiry,
//         refreshTokenCipherText } = await generateToken({ user, sessionId });

// const   ipAddressCipherText = await encrypt({    data: ip,
//                                               options: { secret: config.ipAddressEncryptionKey }});
// const userUpdate = { $set: { "security.failedAttempts": 0,
//                              "lock.lockUntil": null,
//                              "security.lastLogin": new Date(),
//                              ...(timezone && !user.timezone && (moment.tz.zone(timezone) !== null) && { timezone })
//                         },
//                      $push: {
//                             activeSessions: {
//                                                 $each: [sessionId],
//                                                 $slice: -config.maxSessionsAllowed
//                                             }
//                         }
//                 };

// const sessionPayload = {      _id: sessionId,
//                            userId: user._id,
//                          provider: 'local-'+identifierName,
//                       fingerprint,
//                           tokenId: crypto.createHash('sha256').update(tokenId).digest('hex'),
//                 accessTokenExpiry,
//                      refreshToken: refreshTokenCipherText,
//                refreshTokenExpiry,
//                              role: user.role,
//                                ip: ipAddressCipherText,
//                          userAgent,
//                           timezone,               }
                                
// const loginHistoryPayload = { userId: user._id,
//                            sessionId,
//                             provider: 'local-'+identifierName,
//                          fingerprint,
//                                   ip: ipAddressCipherText,
//                             userAgent }

// const promiseArray = [  setSession({ sessionId,
//                                        tokenId,
//                                        payload: { sub: user.referenceId, 
//                                                  role: user.role         }}),

//                         Session.create([sessionPayload], 
//                                   { session: auth_db_session }),

//                            User.updateOne({ _id: user._id },
//                                      userUpdate,
//                                       { session: auth_db_session }),

//                    LoginHistory.create([loginHistoryPayload],  
//                                        { session: auth_db_session })]
// await Promise.all(promiseArray);

// /** *********************Temporary Execution of function********************* **/
// /**   This operation need transfer into corn job/ this will done in future    **/
// const updatedUser = await User.findOne({ _id: user._id }, { activeSessions: 1 });
// await Session.deleteMany({ userId: user._id,
//                             _id: { $nin: updatedUser.activeSessions }
//                         }, { session: auth_db_session });
// /** ########################################################################## **/

// accessToken: string;
// refreshToken: string;
// sessionId: mongoose.Types.ObjectId;
// user: any;




























































                        // await Promise.all([setSession({ sessionId,
                        //                                   tokenId,
                        //                                   payload: { sub: user.referenceId, 
                        //                                             role: user.role         }}),

                        //                    Session.create([sessionPayload], 
                        //                                   { session: auth_db_session }),

                        //                    User.updateOne({ _id: user._id },
                        //                                     userUpdate,
                        //                                   { upsert: true, session: auth_db_session }),
                                                            
                        //                    LoginHistory.create([loginHistoryPayload],  
                        //                                       { session: auth_db_session })])

                        

                        // if (MAX_SESSIONS_ALLOWED && user?.activeSessions?.length) {
                        //     await cleanInvalidSessions({ activeSessions: user.activeSessions, 
                        //                                          userId: user._id, 
                        //                                currentSessionId: loggedInSession._id.toString(), 
                        //                                    sessionLimit: MAX_SESSIONS_ALLOWED, 
                        //                                              db: auth_db,
                        //                                      db_session: auth_db_session  })
                        //     }