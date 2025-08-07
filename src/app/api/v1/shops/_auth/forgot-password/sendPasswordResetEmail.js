import nodemailer from 'nodemailer';

export default async function sendPasswordResetEmail({ 
  email: receiverEmail, 
  name, 
  resetUrl, 
  shopName 
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

    // HTML template with improved styling and security
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your password for your ${shopName} account.</p>
        
        <div style="margin: 20px 0; text-align: center;">
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #2563eb; 
                    color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        
        <p>If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
        
        <p style="font-size: 0.9em; color: #666;">
          <strong>Important:</strong> This link will expire in 1 hour. 
          For security reasons, do not share this email with anyone.
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        
        <p style="font-size: 0.9em; color: #777;">
          Can't click the button? Copy and paste this link into your browser:<br>
          <code style="word-break: break-all;">${resetUrl}</code>
        </p>
      </div>
    `;

    const textContent = `
      Password Reset Request
      ----------------------
      Hello ${name},
      
      We received a request to reset your password for your ${shopName} account.
      
      To reset your password, please visit this link:
      ${resetUrl}
      
      If you didn't request this, please ignore this email. Your password will remain unchanged.
      
      Important: This link will expire in 1 hour. For security reasons, do not share this email with anyone.
    `;

    const mailOptions = {
      from: `"${shopName} Support" <${process.env.NOREPLY_EMAIL || 'noreply@example.com'}>`,
      to: receiverEmail,
      subject: `Password Reset Instructions for ${shopName}`,
      html: htmlContent,
      text: textContent
    };

    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Password reset email error:', error);
    throw new Error('Failed to send password reset email');
  }
}