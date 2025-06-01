import nodemailer from 'nodemailer'
import { userModel } from '@/models/auth/User';
import authDbConnect from '@/app/lib/mongodb/authDbConnect';
import crypto from 'crypto';


export default async function sendEmail({email, emailType, userId}) {
    try {
        const token = crypto.randomBytes(32).toString('hex');
        const db = await authDbConnect();
        const User = userModel(db);

        if(emailType === "VERIFY"){
            await User.findByIdAndUpdate(userId, {
                $set: {
                    "verification.emailVerificationToken": token,
                    "verification.emailVerificationTokenExpireAt": Date.now() + 3600000
                }
            });
        }else if(emailType === "RESET"){
            await User.findByIdAndUpdate(userId, {
                $set: {
                    "security.forgotPasswordToken": token,
                    "security.forgotPasswordTokenExpiry": Date.now() + 3600000
                }
            });
        }

        const transporter = nodemailer.createTransport({
                                host: process.env.MAILTRAP_HOST,
                                port: parseInt(process.env.MAILTRAP_PORT),
                                auth: {
                                        user: process.env.MAILTRAP_USER, 
                                        pass: process.env.MAILTRAP_PASS
                                    }
                            });

        const mailOptions = {
            from: '<mamunofficialmail.email>',
            to: email,
            subject: emailType === 'VERIFY' ? "Verify your email": "Reset your password",
            html: `<p> Click 
                        <a href="${process.env.BASE_URL}/verifyemail?token=${hashedToken}">
                            here
                        </a> to${emailType==="VERIFY"
                                    ? "verify your email" 
                                    : "reset your password"}
                        or copy and past the link bellow in your browser.
                        <br/> ${process.env.BASE_URL}/verifyemail?token=${hashedToken}
                    </p>`,
          }

        return await transporter.sendMail(mailOptions)
    } catch (error) {
        throw new Error(error.message)
    }
}


