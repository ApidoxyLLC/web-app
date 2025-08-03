

// WhatsApp Token Management
const whatsappTokenStore = {
  accessToken: process.env.WHATSAPP_API_TOKEN,
  expiry: null,
  lastRefreshAttempt: null,
  authPromise: null
};

async function refreshWhatsAppToken() {
  // Return ongoing auth if exists
  if (whatsappTokenStore.authPromise) {
    return whatsappTokenStore.authPromise;
  }

  // Prevent too frequent refresh attempts
  if (whatsappTokenStore.lastRefreshAttempt &&
    Date.now() - whatsappTokenStore.lastRefreshAttempt < 30000) {
    return null;
  }

  whatsappTokenStore.lastRefreshAttempt = Date.now();

  try {
    whatsappTokenStore.authPromise = fetch(
      `https://graph.facebook.com/v17.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${process.env.FB_APP_ID}&` +
      `client_secret=${process.env.FB_APP_SECRET}&` +
      `fb_exchange_token=${process.env.WHATSAPP_API_TOKEN}`
    );

    const response = await whatsappTokenStore.authPromise;

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Refresh failed');
    }

    const { access_token, expires_in } = await response.json();
    whatsappTokenStore.accessToken = access_token;
    whatsappTokenStore.expiry = new Date(Date.now() + expires_in * 1000);

    return access_token;
  } catch (error) {
    console.error('Token refresh failed:', error.message);
    throw error;
  } finally {
    whatsappTokenStore.authPromise = null;
  }
}

async function getValidWhatsAppToken() {
  // Refresh if token is expired or will expire soon (within 15 minutes)
  if (!whatsappTokenStore.expiry || Date.now() > whatsappTokenStore.expiry.getTime() - 900000) {
    try {
      const newToken = await refreshWhatsAppToken();
      return newToken || whatsappTokenStore.accessToken;
    } catch {
      return whatsappTokenStore.accessToken;
    }
  }
  return whatsappTokenStore.accessToken;
}

export async function sendWhatsAppReceipt({ phone, pdfUrl, invoice, user }) {
  console.log(phone)

  try {
    const token = await getValidWhatsAppToken();
    if (!token) {
      throw new Error('Could not obtain valid token');
    }

    // Try template message first
    try {
      const templateName = "payment_confirmation_1";
      // const templates = await listWhatsAppTemplates();
      // const templateExists = templates.some(t => t.name === templateName);

      // if (!templateExists) {
      //   throw new Error(`Template "${templateName}" not found. Available templates: ${templates.map(t => t.name).join(', ') || 'none'
      //     }`);
      // }

      const payload = {
        messaging_product: "whatsapp",
        // recipient_type: "individual",
        to: phone,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: "en",
            // policy: "deterministic"
          },
          components: [
            {
              type: "header",
              parameters: [{
                type: "document",
                document: {
                  link: pdfUrl,
                  filename: `receipt_${invoice.paymentId}.pdf`
                }
              }]
            },
            {
              type: "body",
              parameters: [
                { type: "text", parameter_name: "user_name", text: "user.name" },       // user_name
                { type: "text", parameter_name: "subscription_package", text: "Premium Monthly" },              // subscription_package
                { type: "text", parameter_name: "transaction_id", text: invoice.paymentId },              // transaction_id
                { type: "text", parameter_name: "validity", text: "2025-09-01" }                    // validity
              ]
            },
            {
              type: "button",
              sub_type: "url",
              index: 0,
              parameters: [
                { type: "text", text: `INV-${invoice.paymentId}` }      // Button parameter
              ]
            }
          ]
        }
      };
      console.log("*******payload")
      console.log(payload)
      const response = await fetch(
        `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000)
        }
      );

      console.log(response)
      const data = await response.json();
      console.log(data)
      if (!response.ok) {
        throw new Error(data.error?.message || 'WhatsApp API error');
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
        timestamp: new Date(),
        method: 'template'
      };
    } catch (templateError) {
      console.warn('Template message failed, falling back to text:', templateError.message);

    }

  } catch (error) {
    console.error('WhatsApp send failed:', {
      error: error.message,
      invoiceId: invoice.paymentId,
      phone: phone.slice(-4)
    });

    return {
      success: false,
      error: error.message,
      isRetryable: !error.message.includes('Invalid') &&
        !error.message.includes('Missing') &&
        !error.message.includes('expired')
    };
  }
}

