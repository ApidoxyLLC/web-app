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
            console.log("lllllllllllllllllll",link)

            const mailOptions = {
            from: `<${senderEmail}>`,
            to: receiverEmail,
            subject: emailType === 'VERIFY' ? "Verify your email" : "Reset your password",
            html: `<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td align="center" style="padding: 40px 0; background-color: #2983cb; color: white; font-size: 24px; font-weight: bold;">
              Verify Your Email
            </td>
          </tr>
          <tr>
            <td style="padding: 40px; color: #333; font-size: 16px; line-height: 1.5;">
              <p>Hi</p>
              <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
              
              <p style="text-align: center; margin: 30px 0;">
                <a href="${link}"
                   style="background-color: #2983cb; color: white; text-decoration: none; padding: 15px 30px; border-radius: 5px; font-weight: bold; display: inline-block;">
                  Verify Email
                </a>
              </p>
              
              <p>If the button doesn’t work, copy and paste the following link into your browser:</p>
              <p style="word-break: break-all;">
                <p style="color: #2983cb;">${link}</p>
              </p>
              
              <p>This link will expire in 15 min. If you did not sign up for this account, please ignore this email.</p>
              
              <p>Thank you,<br>Apidoxy</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 20px; font-size: 12px; color: #999;">
              &copy; 2025 Apidoxy. All rights reserved.
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>`
            };

    return await transporter.sendMail(mailOptions);
    } catch (error) {
        throw new Error(error.message)
    }
}


