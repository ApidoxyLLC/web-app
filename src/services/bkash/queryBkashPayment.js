import { getBkashToken } from './getBkashToken';

export async function queryBkashPayment(paymentID) {
    const token = await getBkashToken();

    const response = await fetch(`${process.env.BKASH_BASE_URL}/payment/query`, {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            Authorization: `Bearer ${token}`, 
            'X-APP-Key': process.env.BKASH_APP_KEY,
        },
        body: JSON.stringify({ paymentID }),
    });

    return await response.json();
}
