import nodemailer from 'nodemailer';

export default async function sendReciptToEmail({
    receiverEmail,
    emailType,
    senderEmail,
    token,
    attachments = [],
    templateData, // Add this new parameter
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

        // Handle different email types
        let subject, html;
        if (emailType === 'RECEIPT') {
            subject = `Payment Receipt #${templateData?.transactionId || ''}`;
            // Use either customHtml or our default template with PDF URL
            html = customHtml || `
        <div style="font-family: Arial, sans-serif;">
          <h2>Payment Confirmation</h2>
          <p>Amount: ${templateData?.amount || 'N/A'}</p>
          <p>Transaction ID: ${templateData?.transactionId || 'N/A'}</p>
          <a href="${templateData?.downloadLink || '#'}">Download Receipt</a>
        </div>
      `;
        } else {
            // Keep existing verify/reset logic unchanged
            const path = emailType === 'VERIFY' ? 'verifyemail' : 'resetpassword';
            const link = `${process.env.BASE_URL}/${path}?token=${token}`;
            subject = emailType === 'VERIFY' ? "Verify your email" : "Reset your password";
            html = `<p>Click <a href="${link}">here</a> to ${emailType === "VERIFY" ? "verify" : "reset"
                }</p>`;
        }

        const mailOptions = {
            from: `"${process.env.EMAIL_SENDER_NAME}" <${senderEmail}>`,
            to: receiverEmail,
            subject,
            html,
            attachments // Keep attachments optional for other email types
        };

        return await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Email sending error:', error);
        throw error;
    }
}