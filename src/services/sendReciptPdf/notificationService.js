import sendReciptToEmail from './emailService';
import sendSMS from './smsService';
import { sendWhatsAppReceipt } from './whatsAppService';
import { userModel } from '@/models/auth/User';
import authDbConnect from "@/lib/mongodb/authDbConnect";

export async function sendPaymentNotification({ userId, pdfBuffer, invoice, pdfUrl }) {
    const auth_db = await authDbConnect();
    const User = userModel(auth_db);

    // Get user details with enhanced error handling
    const user = await User.findById(userId).lean();
    if (!user) {
        console.error(`User not found for notification: ${userId}`);
        return {
            success: false,
            message: 'User not found',
            errorCode: 'USER_NOT_FOUND'
        };
    }

    // Prepare consistent message content
    const messageDetails = {
        amount: `${invoice.amount} ${invoice.currency || 'USD'}`,
        transactionId: invoice.paymentId,
        date: new Date(invoice.createdAt).toLocaleString(),
        packageName: invoice.packageName || 'Service Subscription'
    };

    // 1. EMAIL ATTEMPT (Highest priority)
    // if (user.email) {
    //     try {
    //         const emailResult = await sendReciptToEmail({
    //             receiverEmail: user.email,
    //             senderEmail: process.env.EMAIL_FROM,
    //             emailType: 'RECEIPT',
    //             attachments: [{
    //                 filename: `receipt_${invoice._id}.pdf`,
    //                 content: pdfBuffer.toString('base64'),
    //                 encoding: 'base64'
    //             }],
    //             templateData: messageDetails
    //         });

    //         return {
    //             success: true,
    //             channel: 'email',
    //             details: {
    //                 email: user.email,
    //                 timestamp: new Date(),
    //                 ...emailResult
    //             }
    //         };
    //     } catch (emailError) {
    //         console.error('Email sending failed:', {
    //             userId,
    //             error: emailError.message,
    //             stack: emailError.stack
    //         });
    //         // Continue to next channel
    //     }
    // }

    // 2. WHATSAPP ATTEMPT
    if (user.phone) {
        try {
            const cleanPhone = user.phone.replace(/\D/g, '');

            const whatsappResult = await sendWhatsAppReceipt({
                phone: cleanPhone,
                pdfBuffer,
                pdfUrl,
                invoice: {
                    paymentId: invoice.paymentId,
                    amount: invoice.amount,
                    currency: invoice.currency,
                    ...messageDetails
                },

                user: {
                    name: user.name || 'Customer'
                }
            });

            console.log(whatsappResult)

            if (whatsappResult.success) {
                console.log("***********************success")
                return {
                    success: true,
                    channel: 'whatsapp',
                    details: {
                        phone: cleanPhone,
                        messageId: whatsappResult.messageId,
                        timestamp: new Date()
                    }
                };
            }
        } catch (whatsappError) {
            console.error('WhatsApp sending failed:', {
                userId,
                error: whatsappError.message,
                stack: whatsappError.stack
            });
            // Continue to SMS fallback
        }
    }

    // 3. SMS FALLBACK
    // if (user.phone) {
    //     try {
    //         const cleanPhone = user.phone.replace(/\D/g, '');
    //         const smsText = `Payment Confirmed: ${messageDetails.amount}\n` +
    //             `ID: ${messageDetails.transactionId}\n` +
    //             `Thank you!`;

    //         const smsResult = await sendSMS({
    //             phone: cleanPhone,
    //             message: smsText
    //         });

    //         return {
    //             success: true,
    //             channel: 'sms',
    //             details: {
    //                 phone: cleanPhone,
    //                 length: smsText.length,
    //                 ...smsResult
    //             }
    //         };
    //     } catch (smsError) {
    //         console.error('SMS sending failed:', {
    //             userId,
    //             error: smsError.message
    //         });
    //     }
    // }

    // Final fallback if all channels failed
    return {
        success: false,
        error: 'ALL_NOTIFICATION_METHODS_FAILED',
        details: {
            hasEmail: !!user.email,
            hasPhone: !!user.phone,
            lastAttempt: new Date()
        }
    };
}