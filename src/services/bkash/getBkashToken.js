













export async function getBkashToken() {
  const app_key = process.env.BKASH_APP_KEY
  const app_secret = process.env.BKASH_APP_SECRET
  const username = process.env.BKASH_USERNAME
  const password = process.env.BKASH_PASSWORD
  const bkashBaseURL = 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'

  // Basic auth header (base64 encode username:password)
  const basicAuth = Buffer.from(`${username}:${password}`).toString('base64')

  const res = await fetch(`${bkashBaseURL}/tokenized/checkout/token/grant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${basicAuth}`,
      'X-APP-Key': app_key,
    },
    body: JSON.stringify({
      app_key,
      app_secret,
    }),
  })

  if (!res.ok) {
    const errorData = await res.text()
    throw new Error(`Failed to get bKash token: ${errorData}`)
  }

  const data = await res.json()
  return data.id_token
}





// app.post('/api/payforsms', adminsign, gentoken, async(req, res) => {
//     let price = 0
//     if(parseInt(req.body.qty) < 2000) {
//         price = 800
//     } else if(parseInt(req.body.qty) >= 2000 && parseInt(req.body.qty) <=25000) {
//         if(Number.isInteger(parseInt(req.body.qty) * 0.40)) {
//             price = parseInt(req.body.qty) * 0.40
//         } else {
//             price = parseInt(parseInt(req.body.qty) * 0.40)+1
//         }
//     } else {
//         price = 0
//     }

//     //create a 
//     let trxid = res.eiin + new Date().valueOf();
//     await TransactionDataModel.create({
//         trxid: trxid,
//         eiin: res.eiin,
//         amount : price,
//         created : moment().format('DD MMM YYYY H:M A'), 
//         date : moment().format('DD MMM YYYY H:M A'),
//         payer : res.email,
//         payee : 'Shikkhanobish Payment System',
//         purpose : req.body.for,
//         approved : false,
//     });

//     axios.post('https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/create',
//         {
//             mode: '0011',
//             payerReference: 'refrense',
//             callbackURL: 'https://shikkhanobish.com/api/executepayment',
//             amount: price,
//             currency: 'BDT',
//             intent: 'sale',
//             merchantInvoiceNumber: trxid,
//         },
//         {
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Accept': 'application/json',
//                 'X-App-Key': 'xzzIqNMPyuyN39DUtYGB298Ztc',
//                 'Authorization': res.id_token
//             }
//         }
//     ).then((response) => {
//         if(response.data.statusCode == '0000') {
//             res.json({error: false, redirect: response.data.bkashURL})
//         }
//     }).catch((err) => {
//         res.json({error: err, message: 'Payment page loading failed'})
//     })
// })

// app.get('/api/executepayment', adminsign, gentoken, async(req, res) => {
//     async function updateTransaction(invoiceid, trxID, amount) {
//         await TransactionDataModel.findOneAndUpdate({trxid: invoiceid}, {approved: true, amount: amount, payee: 'Bkash ('+trxID+')'});
//         await SmsDataModel.findOneAndUpdate({eiin: res.eiin}, {$inc: { quantity: parseInt(parseFloat(amount)/ 0.40)+1 }})
//     }
    
//     axios.post('https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/execute',{
//         paymentID : req.query.paymentID
//     },
//     {
//         headers: {
//             'Accept': 'application/json',
//             'X-App-Key': 'xzzIqNMPyuyN39DUtYGB298Ztc',
//             'Authorization': res.id_token
//         }
//     }).then(async (response) =>  {
//         if(response.data.statusCode == '0000') {
//             await updateTransaction(response.data.merchantInvoiceNumber, response.data.trxID, response.data.amount);
//             res.redirect('../sms')
//         } else {
//             res.send('Payment failed. <a href="https://shikkhanobish.com/sms">Go back to SMS Panel</a>')
//         }
//     }).catch((err) => {
//         res.send('Payment failed. <a href="https://shikkhanobish.com/sms">Go back to SMS Panel</a>')
//     })
// })