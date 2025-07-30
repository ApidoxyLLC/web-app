
import { getBkashToken } from '@/services/bkash/getBkashToken';

export async function initiateBkashPayment({ userId, invoiceId, amount }) {
    const token = await getBkashToken();
    console.log("***********************************8")
    console.log(token)
    const bkashUrl = 'https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/create';
    const callbackURL = `${process.env.NEXTAUTH_URL}/api/v1/bkash/callback`;

    const paymentRes = await fetch(bkashUrl, {
        method: 'POST',
        headers: {
            Authorization: token,
            'Content-Type': 'application/json',
            'X-APP-Key': process.env.BKASH_APP_KEY,
        },
        body: JSON.stringify({
            mode: '0011',
            payerReference: userId,
            callbackURL,
            //   amount: amount.toString(),
            amount: '2',
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: invoiceId.toString(),
        }),
    });

    const paymentData = await paymentRes.json();

    if (!paymentData || !paymentData.paymentID) {
        throw new Error(paymentData?.statusMessage || "bKash payment creation failed");
    }

    return paymentData;
}
