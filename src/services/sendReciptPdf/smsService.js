
export default async function sendSMS({ phone, message }) {
    if (!phone || !message) {
        console.error('SMS Validation Failed: Missing phone or message');
        throw new Error('Phone and message are required');
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
        console.error(`Invalid phone number: ${phone} (cleaned: ${cleanPhone})`);
        throw new Error('Invalid phone number format');
    }

    const MAX_LENGTH = 160;
    const sanitizedMessage = encodeURIComponent(
        message.length > MAX_LENGTH
            ? `${message.substring(0, MAX_LENGTH - 3)}...`
            : message
    );

    const smsApiUrl = `http://bulksmsbd.net/api/smsapi?api_key=${process.env.SMS_API_KEY}&type=text&number=${cleanPhone}&senderid=${process.env.SMS_SENDER_ID}&message=${sanitizedMessage}`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(smsApiUrl, {
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!res.ok) {
            throw new Error(`API responded with status ${res.status}`);
        }

        const data = await res.text();

        if (data.includes('SMS SUBMITTED')) {
            console.log(`SMS sent to ${cleanPhone}`, {
                length: sanitizedMessage.length,
                messageId: data.match(/ID: (\w+)/)?.[1] || 'unknown'
            });
            return {
                success: true,
                messageId: data.split('ID: ')[1]?.trim(),
                rawResponse: data
            };
        }

        throw new Error(data || 'Unknown API response');

    } catch (error) {
        const errorDetails = {
            error: error.message,
            phone: cleanPhone,
            apiUrl: smsApiUrl.replace(process.env.SMS_API_KEY, 'REDACTED')
        };

        console.error('SMS Failed:', errorDetails);

        return {
            success: false,
            error: 'Failed to send SMS',
            details: error.name === 'AbortError' ? 'Request timeout' : error.message
        };
    }
}