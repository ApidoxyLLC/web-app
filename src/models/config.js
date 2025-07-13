
const config = {
                     defaultMaxSessions: parseInt(process.env.END_USER_DEFAULT_MAX_SESSIONS || '5', 10),
        accessTokenDefaultExpireMinutes: Number(process.env.END_USER_ACCESS_TOKEN_DEFAULT_EXPIRE_MINUTES || '30'),
       refreshTokenDefaultExpireMinutes: Number(process.env.END_USER_REFRESH_TOKEN_DEFAULT_EXPIRE_MINUTES || '10080'),
  emailVerificationDefaultExpireMinutes: Number(process.env.END_USER_EMAIL_VERIFICATION_EXPIRE_MINUTES || '10'),
  phoneVerificationDefaultExpireMinutes: Number(process.env.END_USER_PHONE_VERIFICATION_EXPIRE_MINUTES || '3'),
};
export default config