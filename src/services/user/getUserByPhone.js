import authDbConnect from "@/lib/mongodb/authDbConnect";
import { userModel } from "@/models/auth/User";

export async function getUserByPhone({ db, phone, fields = [] }) {
    if (!phone || typeof phone !== "string") 
        throw new Error("Phone number is required and must be a string");

    try {
        // const db = await authDbConnect();
        const User = userModel(db);

        const selectFields = [ '+_id', 
                               '+referenceId',
                               ...(fields.includes('security') ? [ 'security.password',
                                                                   'security.failedAttempts'   ] : []),

                               ...(fields.includes('lock') ? [ 'lock.isLocked',
                                                               'lock.lockReason',
                                                               'lock.lockUntil'    ] : []),

                               ...(fields.includes('isVerified') ? [ 'isEmailVerified',
                                                                     'isPhoneVerified'  ] : []),                                                                       

                                ...fields.filter(field => field && !['security', 'lock', 'isVerified'].includes(field))
                            ].join(' ');

        return await User.findOne({ phone: phone.trim() })
                               .select(selectFields)
                               .lean()
                               .exec();

    } catch (error) {
        console.error("Error in getUserByPhone:", error);
        throw new Error("Failed to retrieve user by phone");
    }
}

export default getUserByPhone;