import CredentialsProvider from 'next-auth/providers/credentials';
import loginSchema from './loginDTOSchema';
import authDbConnect from '@/app/lib/mongodbConnections/authDbConnect';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { encrypt, decrypt } from '@/app/utils/encryption';
import { checkLockout, checkVerification, createAccessToken, createRefreshToken, getUserByIdentifier, verifyPassword } from '@/services/auth/user.service';
import { cleanInvalidSessions, createLoginSession, getSessionTokenById, updateSessionToken } from '@/services/auth/session.service';
import { createLoginHistory } from '@/services/auth/history.service';

// import GoogleProvider from 'next-auth/providers/google';
// import AppleProvider from 'next-auth/providers/apple';
// import FacebookProvider from "next-auth/providers/facebook";
// import GitHubProvider from "next-auth/providers/github";

authDbConnect()

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: 'identifier-password-login',
            id: 'identifier-password-login',
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


                    const user = await getUserByIdentifier({name: identifierName, value: identifier})

                    console.log(user)

                    if (!user || !user.security?.password) throw new Error("Invalid credentials");

                    checkLockout(user)
                    const isPasswordVerified = await verifyPassword({user, password})
                    if(!isPasswordVerified) return null
                    checkVerification({user, identifier})
                    // Reset security counters on success

                    const loginTransactionSession = await mongoose.startSession();
                          loginTransactionSession.startTransaction()
                try {
                    const ip =  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                                req.headers['x-real-ip'] || 
                                req.socket?.remoteAddress || '';
                    const userAgent = req.headers['user-agent'] || '';  
                    const sessionId = new mongoose.Types.ObjectId();
                    const MAX_SESSIONS_ALLOWED = Math.abs(Number(process.env.MAX_SESSIONS_ALLOWED)) || 5;                    
                    const  USER_ACCESS_TOKEN_EXPIRE_MINUTES = process.env.USER_ACCESS_TOKEN_EXPIRE_MINUTES || 15;
                    const USER_REFRESH_TOKEN_EXPIRE_MINUTES = process.env.USER_REFRESH_TOKEN_EXPIRE_MINUTES  || 86400
                    const               ACCESS_TOKEN_SECRET = process.env.USER_ACCESS_TOKEN_SECRET ;
                    const       ACCESS_TOKEN_ENCRYPTION_KEY = process.env.ACCESS_TOKEN_ENCRYPTION_KEY || ''
                    const      REFRESH_TOKEN_ENCRYPTION_KEY = process.env.REFRESH_TOKEN_ENCRYPTION_KEY || ''

                    const {token: accessToken, 
                        expireAt: accessTokenExpAt  } = createAccessToken({ user, 
                                                                            sessionId, 
                                                                            secret: ACCESS_TOKEN_SECRET, 
                                                                            expire: USER_ACCESS_TOKEN_EXPIRE_MINUTES });                    

                    const { token: refreshToken,
                            expireAt: refreshTokenExpAt  } = createRefreshToken({ expire: USER_REFRESH_TOKEN_EXPIRE_MINUTES  })

                    const accessTokenCipherText = await encrypt({        data: accessToken,
                                                                      options: { secret: ACCESS_TOKEN_ENCRYPTION_KEY }      });

                    const refreshTokenCipherText = await encrypt({       data: refreshToken,
                                                                      options: { secret: REFRESH_TOKEN_ENCRYPTION_KEY }     });

                    console.log(accessTokenCipherText)                                                                      
                    const savedLoginSession = await createLoginSession({          id: sessionId, 
                                                                                 user, 
                                                                             provider: 'local-'+identifierName,
                                                                          accessToken: accessTokenCipherText,  
                                                                 accessTokenExpiresAt: accessTokenExpAt,
                                                                         refreshToken: refreshTokenCipherText,
                                                                refreshTokenExpiresAt: refreshTokenExpAt,
                                                                                   ip,
                                                                            userAgent,
                                                                   transactionSession: loginTransactionSession })

                        await createLoginHistory({   userId: user._id, 
                                                  sessionId: savedLoginSession._id, 
                                                   provider: 'local-'+identifierName,
                                                         ip, 
                                                  userAgent,
                                         transactionSession: loginTransactionSession })     

                        if (MAX_SESSIONS_ALLOWED && user?.activeSessions?.length) {
                            await cleanInvalidSessions({ activeSessions: user.activeSessions, 
                                                           userId: user._id, 
                                                 currentSessionId: savedLoginSession._id.toString(), 
                                                     sessionLimit: MAX_SESSIONS_ALLOWED, 
                                               transactionSession: loginTransactionSession  })
                        }

                        await loginTransactionSession.commitTransaction();
                        loginTransactionSession.endSession();

                        return {
                                     email: user.email,
                                  username: user.username,
                                      name: user.name,
                               accessToken: accessToken,                   
                          accessTokenExpAt: accessTokenExpAt,
                              refreshToken: refreshToken,
                                  provider: 'local-'+identifierName,
                                      role: user.role,
                                isVerified: Boolean( user.verification?.isEmailVerified ||
                                                     user.verification?.isPhoneVerified  )
                            };
                } catch (error) {
                    await loginTransactionSession.abortTransaction()
                    loginTransactionSession.endSession()
                    console.error("Login failed:", error);
                    throw new Error("Authentication failed")
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
            if (user) {
                // token.id = user.id;
                token.accessToken = user.accessToken;
                token.accessTokenExpAt = user.accessTokenExpAt;
                token.refreshToken = user.refreshToken;
                token.username = user?.username || '';
                token.email = user?.email || '';
                token.phone = user?.phone || '';
                token.role = user.role || '';
                token.isVerified = user.isVerified || false;
                token.provider = user.provider;
            }
            // console.log(token.accessTokenExpAt)

            const accessTokenExpire_ms  = new Date(token.accessTokenExpAt).getTime()

            if(Date.now() < accessTokenExpire_ms){
                return token;
            }

            const ACCESS_TOKEN_SECRET = process.env.USER_ACCESS_TOKEN_SECRET ;
            const REFRESH_TOKEN_ENCRYPTION_KEY = process.env.REFRESH_TOKEN_ENCRYPTION_KEY || ''
            const USER_ACCESS_TOKEN_EXPIRE_MINUTES = Number(process.env.USER_ACCESS_TOKEN_EXPIRE_MINUTES  || 15);
            const USER_REFRESH_TOKEN_EXPIRE_MINUTES = Number(process.env.USER_REFRESH_TOKEN_EXPIRE_MINUTES || 86400)  
            
            if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_ENCRYPTION_KEY) {
                    console.error('Missing required environment variables');
                    // return null;
                }

            try {
              const newTokens  = await tokenRefresh({ token, 
                                                              accessTokenSecret: ACCESS_TOKEN_SECRET, 
                                                              refreshTokenKey: REFRESH_TOKEN_ENCRYPTION_KEY,
                                                              accessTokenExpire: USER_ACCESS_TOKEN_EXPIRE_MINUTES,
                                                              refreshTokenExpire: USER_REFRESH_TOKEN_EXPIRE_MINUTES
                                                            })
                if(!newTokens){
                    return null
                }
                        
              token.accessToken = newTokens.accessToken;
              token.accessTokenExpAt =  newTokens.accessTokenExpAt;
              token.refreshToken = newTokens.refreshToken;
              return token 
            } catch (error) {
              return null
            }
            
            
        },
        async session(params) {
            console.log(params)
            const { session, token } = params
            // console.log(session)
            // session.user.id = token.id;
            session.user.isVerified = token.isVerified;

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
    //   throw new Error( 'Invalid token data...', );
      return null;
    }
  try {
    if (token.provider === "local-email" || token.provider === "local-phone") {
            
      const data = jwt.decode(token.accessToken, accessTokenSecret)
      const { sessionId } = data
      if ( !sessionId ) return null //  throw new Error( `Invalid session...`, );
        const session = await getSessionTokenById(sessionId)
      if(!session)  return null // throw new Error( `No login data...`, );
      const oldRefreshToken = await decrypt({  cipherText: session.refreshToken, 
                                                  options: { secret: refreshTokenKey } })                         
      if( oldRefreshToken != token.refreshToken ) return null //  throw new Error( `No login data...`, );

        const {    token: accessToken, 
                expireAt: accessTokenExpAt  } = createAccessToken({user: { ...data}, sessionId, secret: accessTokenSecret, expire: accessTokenExpire })

        const {    token: refreshToken,
                expireAt: refreshTokenExpAt  } = createRefreshToken({ expire: refreshTokenExpire })

        await updateSessionToken({sessionId, accessToken, refreshToken})

        return {    accessToken, accessTokenExpAt,
                   refreshToken, refreshTokenExpAt  }
    } 

    // return null;
    throw new Error("Unsupported provider or missing refresh token");
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return null
  }
}
