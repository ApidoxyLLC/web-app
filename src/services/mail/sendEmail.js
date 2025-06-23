import nodemailer from 'nodemailer'



export default async function sendEmail({receiverEmail, emailType, senderEmail, token}) {
    try {
            const transporter = nodemailer.createTransport({
                                        host: process.env.MAILTRAP_HOST,
                                        port: parseInt(process.env.MAILTRAP_PORT),
                                        auth: {
                                            user: process.env.MAILTRAP_USER,
                                            pass: process.env.MAILTRAP_PASS
                                        }
                                    });

            const path = emailType === 'VERIFY' ? 'verifyemail' : 'resetpassword';
            const link = `${process.env.BASE_URL}/${path}?token=${token}`;

            const mailOptions = {
            from: `<${senderEmail}>`,
            to: receiverEmail,
            subject: emailType === 'VERIFY' ? "Verify your email" : "Reset your password",
            html: `<p>
                    Click <a href="${link}">here</a> to ${emailType === "VERIFY" ? "verify your email" : "reset your password"},
                    or copy and paste the link below in your browser:
                    <br/> ${link}
                    </p>`
            };

    return await transporter.sendMail(mailOptions);
    } catch (error) {
        throw new Error(error.message)
    }
}


