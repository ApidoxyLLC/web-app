import { userModel } from "@/models/auth/User";
import authDbConnect from "@/lib/mongodb/authDbConnect";

export async function verifyPassword({ payload }) {
    if (!payload || typeof payload !== "object") 
        throw new Error("Invalid data format");
    
    const { user, password } = payload || {};
    if (!user?.security?.password) 
        return { status: false, reason: "no_password", message: "Password not set." };
    
    const validPassword = await bcrypt.compare(password, user.security.password);
    if (!validPassword) {
        const newAttempts = (user.security?.failedAttempts || 0) + 1;
        const          db = await authDbConnect();
        const        User = userModel(db);
        const       query = User.updateOne({ _id: user._id },
                                           {
                                                $inc: { "security.failedAttempts": 1 },
                                                $set: { "lock.lockUntil": calculateLockTime(newAttempts) },
                                            });
        await query;
        return { status: false, reason: "invalid_password", message: "Incorrect password." };
    }
    return { status: true };
}
export default verifyPassword;