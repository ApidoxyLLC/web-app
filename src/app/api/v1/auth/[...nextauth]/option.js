import CredentialsProvider from 'next-auth/providers/credentials';
import loginSchema from './loginDTOSchema';
import authDbConnect from '@/app/lib/mongodb/authDbConnect';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { encrypt, decrypt } from '@/lib/encryption/cryptoEncryption';
import { checkLockout, checkVerification, createAccessToken, createRefreshToken, getUserByIdentifier, verifyPassword } from '@/services/auth/user.service';
import { cleanInvalidSessions, createLoginSession, getSessionTokenById, updateSessionToken } from '@/services/auth/session.service';
import { createLoginHistory } from '@/services/auth/history.service';
import { userModel } from '@/models/auth/User';

// import GoogleProvider from 'next-auth/providers/google';
// import AppleProvider from 'next-auth/providers/apple';
// import FacebookProvider from "next-auth/providers/facebook";
// import GitHubProvider from "next-auth/providers/github";



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
                                                                      
                    const savedLoginSession = await createLoginSession({          id: sessionId, 
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
                }finally{
                    auth_db_session.endSession()
                }

                // Return user object                    
                } catch (error) {
                    throw new Error("Authentication failed")
                }                
            },
            

        }),

    ],
    callbacks: {
        async jwt(params) {
            const { token, user, account } = params
            console.log(token)
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
                    // console.error('Missing required environment variables');
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
    if (token.provider === "local-email" || token.provider === "local-phone") {
            
      const data = jwt.decode(token.accessToken, accessTokenSecret)

      const { sessionId } = data
      if ( !sessionId ) return null 

      const auth_db = await authDbConnect();
      const session = await getSessionTokenById({db: auth_db, sessionId})
      if(!session)  return null // throw new Error( `No login data...`, );
      const oldRefreshToken = await decrypt({  cipherText: session.refreshToken, 
                                                  options: { secret: refreshTokenKey } })                         
      if( oldRefreshToken != token.refreshToken ) return null //  throw new Error( `No login data...`, );

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
