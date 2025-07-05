import { userModel } from "@/models/auth/User";
import authDbConnect from "@/lib/mongodb/authDbConnect";

export async function getUserByEmail({ email, fields = [] }) {
    if (!email || typeof email !== "string" || !email.trim())
        throw new Error("A valid email address is required.");

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

                                ...(fields.includes('verification') ? [ '+verification',
                                                                        '+isEmailVerified',
                                                                        '+isPhoneVerified' ] : []),

                                ...(fields.includes('oauth') ? [ '+oauth',
                                                                 '+oauth.google',
                                                                 '+oauth.facebook' ] : []),

                                ...fields.filter(field => field && !['security', 'lock', 'verification', 'oauth'].includes(field))
                            ].join(' ');

        return await UserModel.findOne({ email: email.trim() })
                              .select(selectFields)
                              .lean()
                              .exec();
    } catch (error) {
        console.error("getUserByEmail error:", error);
        throw new Error("Unable to fetch user by email.");
    }
}

export default getUserByEmail;