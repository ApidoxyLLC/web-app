

export async function createShopUser({ vendorId }) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format');
    }
    const { name, email, phone, password } = data || {}
    const User = userModel(db)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const token = crypto.randomBytes(32).toString('hex');
    const verificationToken = crypto.createHash('sha256').update(token).digest('hex');

    const EMAIL_VERIFICATION_EXPIRY = Number(process.env.EMAIL_VERIFICATION_EXPIRY || 15); // minutes
    const PHONE_VERIFICATION_EXPIRY = Number(process.env.PHONE_VERIFICATION_EXPIRY || 5); // minutes

    const userData = {          name,
                            security: { ...(password 
                                      && {  password: hashedPassword,
                                            salt } ) },
                        verification: { ...(email && {
                                            emailVerificationToken: verificationToken,
                                            emailVerificationTokenExpiry: new Date( Date.now() + (EMAIL_VERIFICATION_EXPIRY * 60 * 1000) ),                                          
                                          }),
                                        ...((phone && !email) && { 
                                            phoneVerificationOTP: Math.floor(100000 + Math.random() * 900000).toString(),
                                            phoneVerificationOTPExpiry: new Date(Date.now() + (PHONE_VERIFICATION_EXPIRY * 60 * 1000))
                                          })
                                      },
                      ...(email && { email }),
                      ...(phone && {  phone })
                    };

    const newUser = new User(userData);
    return await newUser.save(session ? { session } : {});
}