import nodemailer from 'nodemailer'
import { userModel } from '@/models/auth/User';
import authDbConnect from '@/app/lib/mongodb/authDbConnect';
import crypto from 'crypto';


export default async function sendEmail({receiverEmail, emailType, senderEmail, token}) {
    try {
        const transporter = nodemailer.createTransport({
                                host: process.env.MAILTRAP_HOST,
                                port: parseInt(process.env.MAILTRAP_PORT),
                                auth: { user: process.env.MAILTRAP_USER, 
                                        pass: process.env.MAILTRAP_PASS }
                            });

        const mailOptions = {
            from: `<${senderEmail}>`,
            to: receiverEmail,
            subject: emailType === 'VERIFY' ? "Verify your email": "Reset your password",
            html: `<p> Click 
                        <a href="${process.env.BASE_URL}/verifyemail?token=${token}">
                            here
                        </a> to${emailType==="VERIFY"
                                    ? "verify your email" 
                                    : "reset your password"}
                        or copy and past the link bellow in your browser.
                        <br/> ${process.env.BASE_URL}/verifyemail?token=${token}
                    </p>`,
          }

        return await transporter.sendMail(mailOptions)
    } catch (error) {
        throw new Error(error.message)
    }
}


