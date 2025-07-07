import { userModel } from "@/models/auth/User";
import authDbConnect from "@/lib/mongodb/authDbConnect";

export async function getUserByIdentifier({ auth_db, payload, fields=[] }) {
    
    if (!payload || typeof payload !== "object" || Array.isArray(payload) || payload === null) 
        throw new Error("Invalid data format: expected an object");
    
    const { email, phone, username } = payload;
    if (!email && !phone && !username)
        throw new Error("At least one identifier (email, phone or username) is required.");

    const query = { $or: [] };
    if (email)    query.$or.push({    email: email.trim() });    
    if (phone)    query.$or.push({    phone: phone.trim() });
    if (username) query.$or.push({ username: username.trim() });

    try {
        // const   db = await authDbConnect();
        const User = userModel(auth_db);
        const selectFields = [ '+_id', 
                               '+referenceId',
                               ...(fields.includes('security') ? [ 'security.password',
                                                                   'security.failedAttempts'   ] : []),

                               ...(fields.includes('lock') ? [ 'lock.isLocked',
                                                               'lock.lockReason',
                                                               'lock.lockUntil'    ] : []),
                               ...(fields.includes('otp-verification') ? [ 'verification',
                                                                           'verification.otp',
                                                                           'verification.otpExpiry',
                                                                           'verification.otpAttempts' ] : []),               

                               ...(fields.includes('email-verification') ? [ 'verification',
                                                                             'verification.token',
                                                                             'verification.tokenExpiry'] : []),

                               ...(fields.includes('isVerified') ? [ 'isEmailVerified',
                                                                     'isPhoneVerified'  ] : []),                                                                       

                                ...fields.filter(field => field && !['security', 'lock', 'otp-verification', 'email-verification', 'isVerified'].includes(field))
                            ].join(' ');

        console.log(selectFields)
        return await User.findOne(query)
                         .select(selectFields)
                         .lean().exec();
    } catch (error) {
        console.log(error)
        throw new Error("something went wrong...");
    }
}

export default getUserByIdentifier;