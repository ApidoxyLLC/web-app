import { userModel } from "@/models/auth/User";
import authDbConnect from "@/lib/mongodb/authDbConnect";

export async function getUserByEmail({ email, fields = [] }) {
    if (!email || typeof email !== "string" || !email.trim())
        throw new Error("A valid email address is required.");

    try {
        const db = await authDbConnect();
        const UserModel = userModel(db);

        const selectFields = [ '_id',
                               'referenceId',
                                ...fields.filter(field => field)
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