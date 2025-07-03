export default async function sendSMS({ phone, message }) {
  const SMS_API_KEY = process.env.SMS_API_KEY;
  const SMS_SENDER_ID = process.env.SMS_SENDER_ID;
  const smsApiUrl = `http://bulksmsbd.net/api/smsapi?api_key=${SMS_API_KEY}&type=text&number=${phone}&senderid=${SMS_SENDER_ID}&message=${message}`;
  try {
    const res = await fetch(smsApiUrl);
    const data = await res.text(); // or .json() depending on API
    console.log(data);
    if (!res.ok) throw new Error(`SMS sending failed...`);
    return data;
  } catch (error) {
    console.error("SMS error:", error);
    return null;
  }
}
