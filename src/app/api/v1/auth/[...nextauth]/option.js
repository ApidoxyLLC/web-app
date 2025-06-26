import CredentialsProvider from 'next-auth/providers/credentials';
import loginSchema from './loginDTOSchema';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { encrypt, decrypt } from '@/lib/encryption/cryptoEncryption';
import { checkLockout, checkVerification, createAccessToken, createRefreshToken, getUserByIdentifier, verifyPassword } from '@/services/auth/user.service';
import { cleanInvalidSessions, createLoginSession, getSessionTokenById, updateSessionToken } from '@/services/auth/session.service';
import { createLoginHistory } from '@/services/auth/history.service';
import { userModel } from '@/models/auth/User';
import { sessionModel } from '@/models/auth/Session';
import GoogleProvider from 'next-auth/providers/google'
import FacebookProvider from 'next-auth/providers/facebook'
import authDbConnect from '@/lib/mongodb/authDbConnect';

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
                    const parsed = loginSchema.safeParse(credentials);
                    if (!parsed.success) { throw new Error("Invalid input") }
                    const { identifier, password, identifierName, fingerprint, userAgent, timezone } = parsed.data;                    

                    const          auth_db = await authDbConnect();
                    const        UserModel = userModel(auth_db);
                    const { phone, email } = { [identifierName]: identifier }

                    if (!email && !phone) 
                        throw new Error('At least one identifier (email or phone) is required.');
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
                    const sessionOptions = {
                            readPreference: 'primary',
                            readConcern: { level: 'local' },
                            writeConcern: { w: 'majority' }
                            };
                    const auth_db_session = await auth_db.startSession(sessionOptions);
                          auth_db_session.startTransaction()
                try {
                    const ip =  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                                req.headers['x-real-ip'] || 
                                req.socket?.remoteAddress || '';
                    const userAgent = req.headers['user-agent'] || '';  
                    const sessionId = new mongoose.Types.ObjectId();
                    const MAX_SESSIONS_ALLOWED = Math.abs(Number(process.env.MAX_SESSIONS_ALLOWED)) || 5;                    
                    const       ACCESS_TOKEN_EXPIRE_MINUTES = process.env.ACCESS_TOKEN_EXPIRE_MINUTES || 15;
                    const      REFRESH_TOKEN_EXPIRE_MINUTES = process.env.REFRESH_TOKEN_EXPIRE_MINUTES  || 86400
                    const               ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ;
                    const       ACCESS_TOKEN_ENCRYPTION_KEY = process.env.ACCESS_TOKEN_ENCRYPTION_KEY || ''
                    const      REFRESH_TOKEN_ENCRYPTION_KEY = process.env.REFRESH_TOKEN_ENCRYPTION_KEY || ''
                    const         IP_ADDRESS_ENCRYPTION_KEY = process.env.IP_ADDRESS_ENCRYPTION_KEY
                    
                    if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_ENCRYPTION_KEY) {
                        return null;
                    }
                    
                    const {token: accessToken, 
                        expireAt: accessTokenExpAt  } = createAccessToken({ user,
                                                                            sessionId, 
                                                                            secret: ACCESS_TOKEN_SECRET, 
                                                                            expire: ACCESS_TOKEN_EXPIRE_MINUTES });                    

                    const { token: refreshToken,
                            expireAt: refreshTokenExpAt  } = createRefreshToken({ expire: REFRESH_TOKEN_EXPIRE_MINUTES  })

                    const accessTokenCipherText = await encrypt({        data: accessToken,
                                                                      options: { secret: ACCESS_TOKEN_ENCRYPTION_KEY }      });

                    const refreshTokenCipherText = await encrypt({       data: refreshToken,
                                                                      options: { secret: REFRESH_TOKEN_ENCRYPTION_KEY }     });

                    const ipAddressCipherText = await encrypt({          data: ip,
                                                                      options: { secret: IP_ADDRESS_ENCRYPTION_KEY }     });
                                                                      
                    const savedLoginSession = await createLoginSession({           id: sessionId, 
                                                                                 user, 
                                                                             provider: 'local-'+identifierName,
                                                                          accessToken: accessTokenCipherText,  
                                                                 accessTokenExpiresAt: accessTokenExpAt,
                                                                         refreshToken: refreshTokenCipherText,
                                                                refreshTokenExpiresAt: refreshTokenExpAt,
                                                                          fingerprint: fingerprint,
                                                                                   ip: ipAddressCipherText,
                                                                            userAgent,
                                                                                 role: user.role,
                                                                                   db: auth_db,
                                                                           db_session: auth_db_session })

                    await createLoginHistory({   userId: user._id, 
                                                sessionId: savedLoginSession._id, 
                                                provider: 'local-'+identifierName,
                                            fingerprint: fingerprint,
                                                        ip, 
                                                userAgent,
                                                        db: auth_db,
                                                db_session: auth_db_session })     

                    if (MAX_SESSIONS_ALLOWED && user?.activeSessions?.length) {
                        await cleanInvalidSessions({ activeSessions: user.activeSessions, 
                                                        userId: user._id, 
                                                currentSessionId: savedLoginSession._id.toString(), 
                                                    sessionLimit: MAX_SESSIONS_ALLOWED, 
                                                            db: auth_db,
                                                    db_session: auth_db_session  })
                    }

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
                return {
                    id: profile.sub,
                    name: profile.name,
                    email: profile.email,
                    image: profile.picture,
                    verified: profile.email_verified
                }
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
                    scope: 'email,public_profile' // Request necessary user data
                }
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
            const sessionOptions = {
                readPreference: 'primary',
                readConcern: { level: 'local' },
                writeConcern: { w: 'majority' }
            };

            const auth_db = await authDbConnect();
            const UserModel = userModel(auth_db);
            const SessionModel = sessionModel(auth_db);
            const auth_db_session = await auth_db.startSession(sessionOptions);
            await auth_db_session.startTransaction();

            try {
                const existingUser = await UserModel.findOne({
                $or: [
                    { email: profile.email },
                    { [`oauth.${account.provider}.id`]: profile.id }
                ]
                }).lean();

                let userId;
                let userRole = ['user'];

                if (!existingUser) {
                    const newUser = {
                                    email: profile.email,
                                    name: profile.name || '',
                                    username: profile.email?.split('@')[0] || cuid(),
                                    oauth: {
                                        [account.provider]: {
                                        id: profile.id,
                                        accessToken: account.access_token,
                                        refreshToken: account.refresh_token,
                                        tokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null
                                        }
                                    },
                                    isEmailVerified: true,
                                    role: ['user'],
                                    security: { password: null }
                                    };

                                    const createdUser = await UserModel.create([newUser], { session: auth_db_session });
                                    userId = createdUser[0]._id;
                } else {
                userId = existingUser._id;
                userRole = existingUser.role;
                }
                await UserModel.updateOne(
                            { _id: userId },
                            { 
                                $set: { 
                                    [`oauth.${account.provider}`]: {
                                        id: profile.id,
                                        accessToken: account.access_token,
                                        refreshToken: account.refresh_token,
                                        tokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null
                                    }
                                } 
                            },
                            { session: auth_db_session }
                        );
                    



                const ip = req?.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                        req?.headers['x-real-ip'] ||
                        req?.socket?.remoteAddress || '';

                const userAgent = req?.headers['user-agent'] || '';
                const sessionId = new mongoose.Types.ObjectId();

                const MAX_SESSIONS_ALLOWED = Math.abs(Number(process.env.MAX_SESSIONS_ALLOWED)) || 5;
                const ACCESS_TOKEN_EXPIRE_MINUTES = Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || 15);
                const REFRESH_TOKEN_EXPIRE_MINUTES = Number(process.env.REFRESH_TOKEN_EXPIRE_MINUTES || 43200);
                const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
                const ACCESS_TOKEN_ENCRYPTION_KEY = process.env.ACCESS_TOKEN_ENCRYPTION_KEY || '';
                const REFRESH_TOKEN_ENCRYPTION_KEY = process.env.REFRESH_TOKEN_ENCRYPTION_KEY || '';
                const IP_ADDRESS_ENCRYPTION_KEY = process.env.IP_ADDRESS_ENCRYPTION_KEY || '';

                if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_ENCRYPTION_KEY) return false;

                const { token: accessToken, expireAt: accessTokenExpAt } = createAccessToken({
                user, sessionId, secret: ACCESS_TOKEN_SECRET, expire: ACCESS_TOKEN_EXPIRE_MINUTES
                });

                const { token: refreshToken, expireAt: refreshTokenExpAt } = createRefreshToken({
                expire: REFRESH_TOKEN_EXPIRE_MINUTES
                });

                const accessTokenCipherText = await encrypt({
                data: accessToken, options: { secret: ACCESS_TOKEN_ENCRYPTION_KEY }
                });

                const refreshTokenCipherText = await encrypt({
                data: refreshToken, options: { secret: REFRESH_TOKEN_ENCRYPTION_KEY }
                });

                const ipAddressCipherText = await encrypt({
                data: ip, options: { secret: IP_ADDRESS_ENCRYPTION_KEY }
                });

                const loginSession = await SessionModel.create([{
                _id: sessionId,
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
                providerData: {
                            provider: account.provider,
                            providerUserId: profile.id,
                            providerAccessToken: account.access_token,
                            providerRefreshToken: account.refresh_token,
                            providerTokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null
                        }
                }], { session: auth_db_session });

                await createLoginHistory({
                        userId: loginSession._id,
                        sessionId,
                        provider: account.provider,
                        fingerprint: null,
                        ip,
                        userAgent,
                        db: auth_db,
                        db_session: auth_db_session
                    });

                if (MAX_SESSIONS_ALLOWED && existingUser?.activeSessions?.length) {
                await cleanInvalidSessions({
                    activeSessions: existingUser.activeSessions,
                    userId,
                    currentSessionId: sessionId.toString(),
                    sessionLimit: MAX_SESSIONS_ALLOWED,
                    db: auth_db,
                    db_session: auth_db_session
                });
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


            if(Date.now() < accessTokenExpire_ms){
                return token;
            }

            const          ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ;
            const REFRESH_TOKEN_ENCRYPTION_KEY = process.env.REFRESH_TOKEN_ENCRYPTION_KEY || ''
            const  ACCESS_TOKEN_EXPIRE_MINUTES = Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES  || 15);
            const REFRESH_TOKEN_EXPIRE_MINUTES = Number(process.env.REFRESH_TOKEN_EXPIRE_MINUTES || 86400)  
            
            if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_ENCRYPTION_KEY) {                    
                return null;
            }

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


async function tokenRefresh({token, accessTokenSecret, refreshTokenKey, accessTokenExpire, refreshTokenExpire}) {
  if (!token) {
      console.error("No refresh token available.");
      return null;
    }
  try {
    if (token.provider === 'google' || token.provider === 'facebook' || token.provider === "local-email" || token.provider === "local-phone") {
            
      const data = jwt.decode(token.accessToken, accessTokenSecret)

      const { sessionId } = data
      if ( !sessionId ) return null 

      const auth_db = await authDbConnect();
      const session = await getSessionTokenById({db: auth_db, sessionId})
      
      if(!session)  return null
      const oldRefreshToken = await decrypt({  cipherText: session.refreshToken, 
                                                  options: { secret: refreshTokenKey } })

      if( oldRefreshToken != token.refreshToken ) return null

        const {    token: accessToken, 
                expireAt: accessTokenExpAt  } = createAccessToken({user: { ...data}, sessionId, secret: accessTokenSecret, expire: accessTokenExpire })

        const {    token: refreshToken,
                expireAt: refreshTokenExpAt  } = createRefreshToken({ expire: refreshTokenExpire })

        await updateSessionToken({db: auth_db, sessionId, accessToken, refreshToken})

        return {    accessToken, accessTokenExpAt,
                   refreshToken, refreshTokenExpAt  }
    } 

    throw new Error("Unsupported provider or missing refresh token");
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return null
  }
}

async function refreshGoogleToken(refreshToken) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Failed to refresh Google token:', data);
    throw new Error(data.error || 'Google token refresh failed');
  }

  return {
    accessToken: data.access_token,
    accessTokenExpires: Date.now() + data.expires_in * 1000,
    refreshToken: data.refresh_token || refreshToken, // May not return new one
  };
}

async function refreshFacebookToken(refreshToken) {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.FACEBOOK_CLIENT_ID,
    client_secret: process.env.FACEBOOK_CLIENT_SECRET,
    fb_exchange_token: refreshToken,
  });

  const res = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?${params}`);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error?.message || "Failed to refresh Facebook token");

  return {
    accessToken: data.access_token,
    accessTokenExpires: Date.now() + data.expires_in * 1000,
    refreshToken, // Facebook doesn't return a new one
  };
}
