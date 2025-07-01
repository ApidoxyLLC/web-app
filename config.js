
const config = {

  // Google provider
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  // facebook provider  
  facebookClientId: process.env.FACEBOOK_CLIENT_ID,
  facebookClientSecret: process.env.FACEBOOK_CLIENT_SECRET,

  // access token 

  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  accessTokenEncryptionKey: process.env.ACCESS_TOKEN_ENCRYPTION_KEY,

  // refresh token 
  refreshTokenEncryptionKey: process.env.REFRESH_TOKEN_ENCRYPTION_KEY,

  // NEXT AUTH SECRET 
  nextAuthSecret: process.env.NEXTAUTH_SECRET,

  // Limitations
  maxSessionsAllowed: parseInt(process.env.MAX_SESSIONS_ALLOWED || '3', 10),
  maxLoginAttempt: parseInt(process.env.MAX_LOGIN_ATTEMPT || '5', 10),
  maxOtpAttempt: parseInt(process.env.MAX_OTP_ATTEMPT || '5', 10),

  // Encryption keys
  ipAddressEncryptionKey: process.env.IP_ADDRESS_ENCRYPTION_KEY,

  // time durations limitations
  accessTokenExpireMinutes: Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES  || '15'),
  refreshTokenExpireMinutes: Number(process.env.REFRESH_TOKEN_EXPIRE_MINUTES || '1440'),
  userLockMinutes: Number(process.env.USER_LOCK_MINUTES || '15'),
  emailVerificationExpireMinutes: Number(process.env.EMAIL_VERIFICATION_EXPIRE_MINUTES || '15'),
  phoneVerificationExpireMinutes: Number(process.env.PHONE_VERIFICATION_EXPIRE_MINUTES || '3')

};
export default config




// Require to implement with zod 

// ACCESS TOKEN 
    // const  ACCESS_TOKEN_EXPIRE_MINUTES = parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES, '10') || 15;
    // const          ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
    // const  ACCESS_TOKEN_ENCRYPTION_KEY = process.env.ACCESS_TOKEN_ENCRYPTION_KEY || '';

    // if (isNaN(ACCESS_TOKEN_EXPIRE_MINUTES)) throw new Error('INVALID_TOKEN_EXPIRY');
    // if (ACCESS_TOKEN_EXPIRE_MINUTES < 1 || ACCESS_TOKEN_EXPIRE_MINUTES > 1440) throw new Error('ACCESS_TOKEN_EXPIRY_OUT_OF_RANGE');
    // if (!ACCESS_TOKEN_SECRET || !ACCESS_TOKEN_ENCRYPTION_KEY) throw new Error('TOKEN_CONFIG_MISSING');


// REFRESH TOKEN 
    // const REFRESH_TOKEN_EXPIRE_MINUTES = parseInt(process.env.REFRESH_TOKEN_EXPIRE_MINUTES, '10')  || 86400;
    // const REFRESH_TOKEN_ENCRYPTION_KEY = process.env.REFRESH_TOKEN_ENCRYPTION_KEY || '';
    // if (isNaN(REFRESH_TOKEN_EXPIRE_MINUTES)) throw new Error('INVALID_TOKEN_EXPIRY');
    // if (REFRESH_TOKEN_EXPIRE_MINUTES < 1 || REFRESH_TOKEN_EXPIRE_MINUTES > 43200) throw new Error('REFRESH_TOKEN_EXPIRY_OUT_OF_RANGE');

    // if (!REFRESH_TOKEN_ENCRYPTION_KEY){
    //     console.log("missing REFRESH_TOKEN_ENCRYPTION_KEY")
    //     throw new Error("Authentication failed")
    // }