import nodemailer from 'nodemailer';

export default async function sendReciptToEmail({
    receiverEmail,
    emailType,
    senderEmail,
    token,
    attachments = [],
    templateData,
    customHtml
}) {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.MAILTRAP_HOST,
            port: parseInt(process.env.MAILTRAP_PORT),
            auth: {
                user: process.env.MAILTRAP_USER,
                pass: process.env.MAILTRAP_PASS
            }
        });

        let subject, html;
        if (emailType === 'RECEIPT') {
            subject = `Payment Receipt #${templateData?.transactionId || ''}`;
            html = customHtml || `
                <div style="font-family: Arial, sans-serif;">
                    <h2>Payment Confirmation</h2>
                    <p>Amount: ${templateData?.amount || 'N/A'}</p>
                    <p>Transaction ID: ${templateData?.transactionId || 'N/A'}</p>
                    ${attachments.length ? '<p>Your receipt is attached.</p>' : ''}
                </div>
            `;
        } else {
            const path = emailType === 'VERIFY' ? 'verifyemail' : 'resetpassword';
            const link = `${process.env.BASE_URL}/${path}?token=${token}`;
            subject = emailType === 'VERIFY' ? "Verify your email" : "Reset your password";
            html = `<p>Click <a href="${link}">here</a> to ${emailType === "VERIFY" ? "verify" : "reset"}</p>`;
        }

        const mailOptions = {
            from: `"${process.env.EMAIL_SENDER_NAME}" <${senderEmail}>`,
            to: receiverEmail,
            subject,
            html,
            attachments
        };

        // Return the email sending result
        const result = await transporter.sendMail(mailOptions);
        return result; // Now returns the email sending info
    } catch (error) {
        console.log('Email sending error:', error);
        throw error; // Re-throw to handle in the calling function
    }
}