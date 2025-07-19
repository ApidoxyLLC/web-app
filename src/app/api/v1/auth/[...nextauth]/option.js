import jwt from "jsonwebtoken";
import crypto from 'crypto'; 
import moment from 'moment-timezone';
import loginDTOSchema from './loginDTOSchema';
import otpLoginDTOSchema from './otpLoginDTOSchema';
import { userModel } from '@/models/auth/User';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import  tokenRefresh from '../utils/tokenRefresh';

import   CredentialsProvider from 'next-auth/providers/credentials';
import        GoogleProvider from 'next-auth/providers/google'
import      FacebookProvider from 'next-auth/providers/facebook'

import   getUserByIdentifier from '@/services/user/getUserByIdentifier';
import        verifyPassword from '@/services/user/verifyPassword';
import        getUserByPhone from '@/services/user/getUserByPhone';
import        getUserByEmail from '@/services/user/getUserByEmail';
import handleSuccessfulLogin from '@/services/user/handleSuccessfulLogin';
import   getUserByProviderId from '@/services/user/getUserByProviderId';

import { validateSession } from '@/lib/redis/helpers/session';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import config from '../../../../../../config';

export const authOptions = {
    session: { strategy: "jwt", maxAge:  24 * 60 * 60, updateAge: 60 * 60   },
    jwt: { maxAge: 24 * 60 * 60 },
    providers: [
        CredentialsProvider({
            name: 'login',
            id: 'login',
            credentials: {
                 identifier: { label: 'Username/Email/phone', type: 'text',     placeholder: 'Username/Email/Phone' },
                   password: { label: 'Password',             type: 'password', placeholder: 'password' },
                fingerprint: { label: 'fingureprint-id',      type: 'text',     placeholder: '' },
                   timezone: { label: 'timezone',             type: 'text',     placeholder: 'Timezone' },
            },
            async authorize(credentials, req) {
                try {
                    // Input validation
                    const parsed = loginDTOSchema.safeParse(credentials);
                    if (!parsed.success) return null;
                    const { identifier, password, identifierName, fingerprint, timezone } = parsed.data;

                    // Rate Limit
                    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || req.socket?.remoteAddress || '';
                    const { allowed, remaining, retryAfter } = await applyRateLimit({ key: ip, scope: 'login'      });
                    if (!allowed) return null

                    if (!['email', 'phone', 'username'].includes(identifierName)) return null
                    const { phone, email, username } = { [identifierName]: identifier }
                    if (!email && !phone && !username) return null

                    // Find user
                    const auth_db = await authDbConnect();
                    const  fields = ['security', 'lock', 'isEmailVerified', 'isPhoneVerified', 'timezone', 'activeSessions', 'email', 'name', 'phone', 'username', '+avatar', 'role', 'theme', 'language', 'currency']
                    const    user = await getUserByIdentifier({ auth_db, payload:{ [identifierName]: identifier }, fields })
       
                    if (!user || !user.security?.password)                              return null
                    if ( user?.security?.failedAttempts > config.maxLoginAttempt)       return null
                    if ((user?.lock?.lockUntil && (user.lock.lockUntil > Date.now())))  return null
                    
                    const passwordVerification = await verifyPassword({ payload:{ user, password } })
                    if(!passwordVerification?.status) return null

                    const notVerified = (identifierName === 'email'    && !user.isEmailVerified) ||
                                        (identifierName === 'phone'    && !user.isPhoneVerified) ||
                                        (identifierName === 'username' && !(user.isEmailVerified || user.isPhoneVerified));
                    if (notVerified) return null

                    const sessionOptions = { readPreference: 'primary',
                                                readConcern: { level: 'local' },
                                               writeConcern: { w: 'majority', j: true }};
                    const auth_db_session = await auth_db.startSession(sessionOptions);
                          auth_db_session.startTransaction()
                    try {
                        const { accessToken,
                                refreshToken,
                                sessionId,
                                accessTokenExpiry } = await handleSuccessfulLogin({   auth_db,
                                                                                         user, 
                                                                                    loginType: 'password', 
                                                                                     provider: 'local-'+identifierName, 
                                                                               identifierName, 
                                                                                           ip, 
                                                                                    userAgent: req.headers['user-agent'], 
                                                                                     timezone, 
                                                                                  fingerprint,
                                                                                      session: auth_db_session,
                                                                                 oauthProfile: null })
                        await auth_db_session.commitTransaction();

                        return {    ...(user.email  && {  email: user.email  }),
                                    ...(user.phone  && {  phone: user.phone  }),
                                    ...(user.name   && {   name: user.name   }),
                                    ...(user.avatar && { avatar: user.avatar }),
                                                  sub: user.referenceId,
                                              session: sessionId,
                                          accessToken,
                                    accessTokenExpiry,
                                         refreshToken,
                                             provider: 'local-'+identifierName,
                                                 role: user.role,
                                           isVerified: Boolean(user?.isEmailVerified || user?.isPhoneVerified),
                                             timezone: user.timezone ?? (timezone && moment.tz.zone(timezone) ? timezone : null),
                                                theme: user.theme    ?? null,
                                             language: user.language ?? null,
                                             currency: user.currency ?? null
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
                      phone: { label: 'phone',            type: 'text',     placeholder: 'Phone'        },
                        otp: { label: 'otp',              type: 'password', placeholder: 'otp'          },
                fingerprint: { label: 'fingureprint-id',  type: 'text',     placeholder: 'Fingureprint' },
                   timezone: { label: 'timezone',         type: 'text',     placeholder: 'Timezone'     },
                },
            async authorize(credentials, req) {
                try {
                    // Input validations
                    const parsed = otpLoginDTOSchema.safeParse(credentials);
                    if (!parsed.success) throw new Error("Invalid input") 
                    
                    // Rate Limit
                    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || req.socket?.remoteAddress || '';
                    const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'otpLogin' });
                    if (!allowed) return null;
                    // Database connection 
                    
                    
                    const { phone, otp, fingerprint, timezone } = parsed.data;
                    // Find user
                    const auth_db = await authDbConnect();
                    const fields = [ 'lock',  'isVerified', 'verification', 'timezone', 'activeSessions', 'email', 'name', 'phone', 'username', '+avatar', 'role', 'theme', 'language', 'currency']
                    const user = await getUserByPhone({ db: auth_db, phone, fields })
                    // const user = await getUserByIdentifier({ auth_db, payload:{ phone }, fields })
                    console.log(user)

                    if (!user || !user.verification?.otp || !user.verification?.otpExpiry) 
                        throw new Error("Invalid credentials");

                    if (user.lock?.lockUntil && user.lock.lockUntil > Date.now()) {
                        const retryAfter = Math.ceil((user.lock.lockUntil - Date.now()) / 1000);
                        throw new Error(`Account temporarily locked, try again in ${retryAfter}`);
                    }

                    // Otp validation
                    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
                    const valid = (user.verification.otp === hashedOtp) && (user.verification.otpExpiry > Date.now())
                    
                    

                    if (!valid) {  
                        user.verification.otpAttempts = (user.verification.otpAttempts || 0) + 1;

                        const updateOps = { $inc:   { 'verification.otpAttempts' : 1   }, 
                                            $unset: { 'verification.otp'         : "",
                                                      'verification.otpExpiry'   : "", } };  

                        if (user.verification.otpAttempts && user.verification.otpAttempts >= config.maxOtpAttempt) 
                                updateOps.$set = {    'lock.isLocked': true,
                                                    'lock.lockReason': 'maximum phone otp exceed',
                                                     'lock.lockUntil': new Date(Date.now() + config.userLockMinutes * 60 * 1000)  };
                        const User = userModel(auth_db);
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
                                accessTokenExpiry } = await handleSuccessfulLogin({   auth_db,
                                                                                         user, 
                                                                                    loginType: 'otp', 
                                                                                     provider: 'local-phone', 
                                                                               identifierName: 'phone', 
                                                                                           ip, 
                                                                                    userAgent: req.headers['user-agent'], 
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
                                timezone: user.timezone ?? (timezone && moment.tz.zone(timezone) ? timezone : null),
                                   theme: user.theme ?? null,
                                language: user.language ?? null,
                                currency: user.currency ?? null
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
                console.log("************************log from profile************************")
                console.log(profile)
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
    callbacks: {
        async signIn({ user, account, profile, email, credentials }) {
            if (account.provider === 'google' || account.provider === 'facebook') {

                const sessionOptions = { readPreference: 'primary',
                                            readConcern: { level: 'local' },
                                           writeConcern: { w: 'majority' } };

                const         auth_db = await authDbConnect();
                const            User = userModel(auth_db);
                const auth_db_session = await auth_db.startSession(sessionOptions);
                await auth_db_session.startTransaction();

                try {
                    let _user = null;
                    if (!profile.email) {
                        _user = await getUserByProviderId({ provider: account.provider, providerId: account.provider === 'google' ? profile.sub : profile.id })
                    }else {
                        _user = await getUserByEmail({ email: profile.email, 
                                                    fields: ['lock', 'oauth', 'activeSessions', 'email', 'name', 'phone', 'username', 'avatar', 'role', 'theme', 'language', 'currency'] })
                    }

                    if (!_user) {
                        // create a new user
                        const payload = { email: profile.email || '',
                                           name: profile.name || '',
                                         avatar: account.provider === 'google' 
                                                            ? profile.picture 
                                                            : account.provider === 'facebook' 
                                                                ? profile.picture.data.url ?? null
                                                                : null,
                                       username: profile.email?.split('@')[0] || profile.id,

                                          oauth: { [account.provider]: { id: account.provider === 'google' ? profile.sub : profile.id,
                                                                accessToken: account.access_token,
                                                                     expiry: account.expires_at,
                                                               refreshToken: account.refresh_token,
                                                             tokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null }  },

                                     isVerified: user.verified,
                                isEmailVerified: account.provider === 'google' 
                                                                    ? profile.email_verified 
                                                                    : profile.email
                                                                        ? true
                                                                        : false ,
                                           role: ['user'] }

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
                      accessTokenExpiry  } = await handleSuccessfulLogin({ auth_db,
                                                                                         user: _user, 
                                                                                    loginType: 'oauth', 
                                                                                     provider: account.provider, 
                                                                               identifierName: 'email', 
                                                                                           ip: null, 
                                                                                    userAgent: null, 
                                                                                     timezone: null, 
                                                                                  fingerprint: null,                                                                                      
                                                                                      session: auth_db_session,
                                                                                 oauthProfile: account })

                    await auth_db_session.commitTransaction();
                                 user.sub = _user.referenceId;
                             user.session = sessionId;
                            user.provider = account.provider;
                         user.accessToken = accessToken;
                   user.accessTokenExpiry = accessTokenExpiry;
                        user.refreshToken = refreshToken;
                                user.role = _user?.role;
                                user.name = profile?.name || '';
                            user.username = profile?.email?.split('@')[0] || profile.id;
                               user.email = profile?.email;
                               user.phone = _user?.phone || '';
                          user.isVerified = true;

                    return true;
                } catch (err) {
                    console.log(err)
                    await auth_db_session.abortTransaction();
                    console.error("OAuth signIn error:", err);
                    return false;
                } finally {
                    auth_db_session.endSession();
                }
            }

            // return account.provider === 'credentials';
            return true
        },
        async jwt({ token, user, account, profile }) {
            if (user && account) {
                return {
                    ...token,
                                  sub: user.sub,
                          accessToken: user.accessToken,
                    accessTokenExpiry: user.accessTokenExpiry,
                         refreshToken: user.refreshToken,
                            sessionId: user.session,
                             provider: user.provider,
                                 user: {        id: user.sub,
                                              name: user.name,
                                             email: user.email,
                                             phone: user.phone,
                                            avatar: user.avatar,
                                              role: user.role,
                                        isVerified: user.isVerified,
                                          timezone: user.timezone,
                                             theme: user.theme,
                                          language: user.language,
                                          currency: user.currency
                                       }
                };
            }
            
            try {
                const accessTokenData = jwt.verify(token.accessToken, config.accessTokenSecret);
                if(accessTokenData){
                    const validSession = await validateSession({ sessionId: token.sessionId, tokenId: accessTokenData.tokenId });
                    if (!validSession) {
                        console.log("SESSION VALIDATION FAILED .......")
                        null
                    }

                    return token;
                }
            } catch (err) {
                console.log("ACCESS TOKEN ERROR .......")
            }

            try {
                const newTokens  = await tokenRefresh({ token })
                console.log("OLD TOKEN .......")
                console.log(token)


                console.log("new TOKEN .......")
                console.log(newTokens)
                    if(!newTokens) {
                        console.log("TOKEN REFRESH FAILED .......")
                        return null
                    }
                    console.log("TOKEN REFRESH SUCCESS .......")
                    return {
                                ...token,
                                accessToken: newTokens.accessToken,
                                accessTokenExpiry: newTokens.accessTokenExpiry,
                                refreshToken: newTokens.refreshToken,
                            };
                } catch (error) {
                    console.log("GET ERROR ON TOKEN REFRESH .......")
                    // console.error("Token refresh failed:", error);
                    return null
                }

            return token
            
            
        },
        async session(params) {
            console.log("from session callback");
            const { session, token } = params;
            if (token?.user && typeof token.user === 'object') {
                session.user = {
                    name: token.user.name,
                    email: token.user.email,
                    username: token.user.username,
                    phone: token.user.phone,
                    role: token.user.role,
                    isVerified: token.user.isVerified,
                    provider: token.provider,
                    local: {
                        timezone: token.user.timezone,
                        theme: token.user.theme,
                        language: token.user.language,
                        currency: token.user.currency
                    }
                };
            }

            return session;

            // console.log("from session callback")
            // const { session, token } = params;
            // if (token && token.user) {
            //     session.user = {
            //                         name: token.user.name,
            //                         email: token.user.email,
            //                         username: token.user.username,
            //                         phone: token.user.phone,
            //                         role: token.user.role,
            //                         isVerified: token.user.isVerified,
            //                         provider: token.provider,
            //                         local: {
            //                                     timezone: token.user.timezone,
            //                                     theme: token.user.theme,
            //                                     language: token.user.language,
            //                                     currency: token.user.currency
            //                                 }
            //                     };
                
            // }
            // return session;
        },
    },
    pages: { signIn: '/login', error: '/auth/error'},
    headers: [ { key: "Access-Control-Allow-Origin", value: "*" }, { key: "Access-Control-Allow-Credentials", value: "true" }],
    logger:{ error(code, metadata){ console.log(code, metadata) } },    
    session: { strategy: 'jwt' },
    basePath: "/api/v1/auth",
    secret: config.nextAuthSecret,
    debug: process.env.NODE_ENV !== 'production'
};
