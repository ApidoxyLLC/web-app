import authDbConnect from "@/lib/mongodb/authDbConnect";
import { userModel } from "@/models/auth/User";

export async function getUserByPhone({ phone, fields = [] }) {
    if (!phone || typeof phone !== "string") 
        throw new Error("Phone number is required and must be a string");

    try {
        const db = await authDbConnect();
        const UserModel = userModel(db);

        const selectFields = [ '+_id',
                               '+referenceId',
                                ...(fields.includes('security') ? [ '+security',
                                                                    '+security.password',
                                                                    '+security.failedAttempts' ] : []),

                                ...(fields.includes('lock') ? [ '+lock',
                                                                '+lock.isLocked',
                                                                '+lock.lockReason',
                                                                '+lock.lockUntil' ] : []),

                                ...(fields.includes('verification') ? [ '+isPhoneVerified',
                                                                        '+verification',
                                                                        '+verification.otp ',
                                                                        '+verification.otpExpiry ',
                                                                        '+verification.otpAttempts ',  ] : []),

            ...fields.filter(field => field && !['security', 'lock', 'verification'].includes(field))
        ].join(' ');

        return await UserModel.findOne({ phone: phone.trim() })
                              .select(selectFields)
                              .lean()
                              .exec();
    } catch (error) {
        console.error("Error in getUserByPhone:", error);
        throw new Error("Failed to retrieve user by phone");
    }
}

export default getUserByPhone;