import B2 from 'backblaze-b2';

export async function authorizeB2() {
    const b2 = new B2({
        applicationKeyId: process.env.B2_KEY_ID,
        applicationKey: process.env.B2_APPLICATION_KEY,
    });

    await b2.authorize(); // this gets auth token & apiUrl
    return b2;
}
