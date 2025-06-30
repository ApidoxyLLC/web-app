
const config = {
  // access token 
  accessTokenExpireMinutes: parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES  || '15', 10),
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  accessTokenEncryptionKey: process.env.ACCESS_TOKEN_ENCRYPTION_KEY,

  // refresh token 
  refreshTokenExpireMinutes: parseInt(process.env.REFRESH_TOKEN_EXPIRE_MINUTES || '1440', 10),
  refreshTokenEncryptionKey: process.env.REFRESH_TOKEN_ENCRYPTION_KEY,

  // NEXT AUTH SECRET 
  nextAuthSecret: process.env.NEXTAUTH_SECRET,
  
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