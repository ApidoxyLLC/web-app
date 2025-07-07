import { userModel } from "@/models/auth/User";
import bcrypt from "bcryptjs";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import config from "../../../config";

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
        // const        User = userModel(db);
        const result = await db.collection('users').updateOne(
                                                    { _id: user._id },
                                                    [
                                                        { $set: { 
                                                                    "security.failedAttempts": { $ifNull: ["$security.failedAttempts", 0] },
                                                                    "lock.lockUntil": calculateLockTime(newAttempts)
                                                                } 
                                                        },
                                                        { $set: { 
                                                                    "security.failedAttempts": { 
                                                                                        $add: ["$security.failedAttempts", 1] 
                                                                                        } 
                                                                } 
                                                        }
                                                    ]);
        console.log(result)
        return { status: false, reason: "invalid_password", message: "Incorrect password." };
    }
    return { status: true };
}
export default verifyPassword;


function calculateLockTime(failedAttempts) {
  if (failedAttempts > config.maxLoginAttempt)
    throw new Error("Too many attempts. Please try again later")

  return new Date(
    Date.now() +
      Math.pow(2, failedAttempts - config.maxLoginAttempt) * 60 * 1000
  );
}