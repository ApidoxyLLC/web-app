import authDbConnect from "@/lib/mongodb/authDbConnect";
import { userModel } from "@/models/auth/User";
import config from "../../../config";
import bcrypt from "bcryptjs";
import crypto from 'crypto'; 

export async function createUser({ session, payload }) {
  if (!payload || typeof payload !== "object") 
    throw new Error("Invalid data format");

  const { name, email, phone, password } = payload || {};
  const             db = authDbConnect()
  const           User = userModel(db);
  const           salt = await bcrypt.genSalt(14);
  const hashedPassword = password ? await bcrypt.hash(password, salt) : undefined;
  const          token = crypto.randomBytes(32).toString("hex");
  const            otp = crypto.randomInt(100000, 999999).toString();

  const userInfo = {            name,
                            security: { ...(password && { password: hashedPassword, salt }) },
                        verification: {
                                        ...(email && {         emailVerificationToken: crypto.createHash("sha256").update(token).digest("hex"),
                                                        emailVerificationTokenExpiry: new Date( Date.now() + config.emailVerificationExpireMinutes * 60 * 1000 ).getTime()
                                                        }),
                                        ...(phone && !email && { phoneVerificationOTP: crypto.createHash("sha256").update(otp).digest("hex"),
                                                        phoneVerificationOTPExpiry: new Date( Date.now() + config.phoneVerificationExpireMinutes * 60 * 1000 ).getTime()
                                                        }),
                                    },
                        ...(email && { email }),
                        ...(phone && { phone }),
                    };

  const query = new User(userInfo);
  const user = await query.save(session ? { session } : {});
  if(user){
    if (email) {
        const result = await sendEmail({    receiverEmail: email,
                                            emailType: "VERIFY",
                                            senderEmail: "no-reply@apidoxy.com",
                                            token });

        console.log("Email sent successfully:", result.messageId);
    }
    if (phone && !email) {
        const message = `Your Apidoxy verification code is: ${otp}. Expire in ${config.phoneVerificationExpireMinutes} minutes.`;
        const result = await sendSMS({  phone: phone, message });
        console.log("OTP sent successfully:");
        console.log(result)
    }
    return user;
  }
  throw new Error("User creation failed...")
}

export default createUser;