import authDbConnect from "@/lib/mongodb/authDbConnect";
import { userModel } from "@/models/auth/User";

export async function getUserByPhone({ db, phone, fields = [] }) {
    if (!phone || typeof phone !== "string") 
        throw new Error("Phone number is required and must be a string");

    try {
        // const db = await authDbConnect();
        const UserModel = userModel(db);

        const selectFields = [ '+_id',
                               '+referenceId',
                                ...fields       ].join(' ');

        return await UserModel.findOne({ phone: phone.trim() })
                              .select(
                                '_id ' +
                                'referenceId ' +
                                'security.password ' +
                                'security.failedAttempts ' +
                                'lock.isLocked ' +
                                'lock.lockReason ' +
                                'lock.lockUntil ' +
                                'verification ' +
                                'verification.otp ' +
                                'verification.otpExpiry ' +
                                'verification.otpAttempts ' +
                                'isEmailVerified ' +
                                'isPhoneVerified ')
                              .lean()
                              .exec();
    } catch (error) {
        console.error("Error in getUserByPhone:", error);
        throw new Error("Failed to retrieve user by phone");
    }
}

export default getUserByPhone;