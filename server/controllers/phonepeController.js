import { StandardCheckoutClient, Env, MetaInfo, StandardCheckoutPayRequest } from 'pg-sdk-node';
import { randomUUID } from 'crypto';
 



const clientId = process.env.PHONEPE_CLIENT_ID;
const clientSecret = process.env.PHONEPE_SECRET;
const clientVersion = process.env.PHONEPE_CLIENT_VERSION;     //insert your client version here
const env =  Env.PRODUCTION;       //change to Env.PRODUCTION when you go live
 
const client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);
 

/**
 * Create PhonePe Payment Link + app-specific UPI deep links
 * @param {object} options
 * @param {number} options.amount - Amount in rupees (integer or float)
 * @param {string} options.redirectUrl - URL to redirect after payment (PhonePe checkout)
 * @param {string} [options.pa] - Optional UPI ID (VPA) like "merchant@bank". Recommended to pass.
 * @param {string} [options.udf1] - Optional meta field
 * @param {string} [options.udf2] - Optional meta field
 * @returns {Promise<{checkoutUrl:string, phonePeDeepLink:string, gPayDeepLink:string, upiDeepLink:string}>}
 */
export const createPhonePePaymentLink = async ({
  amount,
  redirectUrl,
  pa = '',    // VPA (merchant@bank) - pass this for deep-links
  udf1 = '',
  udf2 = ''
}) => {
  try {
    const merchantOrderId = randomUUID();

    const metaInfo = MetaInfo.builder()
      .udf1(udf1)
      .udf2(udf2)
      .build();

    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(amount)           // note: pass in paisa if desired by your flow
      .redirectUrl(redirectUrl)
      .metaInfo(metaInfo)
      .build();

    const response = await client.pay(request);
    const checkoutUrl = response.redirectUrl || response.url || null;

    // Try to discover a VPA from response if pa not supplied
    const discoveredPa =
      pa ||
      (response && (response.vpa || response.upiVpa || response.merchantVpa || response.payeeAddress)) ||
      '';

    // Build deep-links if we have a VPA
    let phonePeDeepLink = null;
    let gPayDeepLink = null;
    let gPayIntent = null;
    let upiDeepLink = null;

    if (discoveredPa) {
      // Build UPI params
      const params = {
        pa: discoveredPa,
        pn: metaInfo?.udf1 || '',        // optional: payee name
        am: String(amount && amount / 100 ? (amount / 100).toFixed(2) : ''), // convert paisa to rupees if you passed paisa
        cu: 'INR',
        tn: metaInfo?.udf2 || ''
      };

      const toQuery = (obj) =>
        Object.entries(obj)
          .filter(([, v]) => v !== undefined && v !== null && String(v) !== '')
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join('&');

      const commonQuery = toQuery(params);

      phonePeDeepLink = `phonepe://pay?${commonQuery}`;
      gPayDeepLink = `gpay://upi/pay?${commonQuery}`;
      upiDeepLink = `upi://pay?${commonQuery}`;

      // Android intent for Google Pay (more reliable from browsers on Android)
      // Format: intent://upi/pay?{query}#Intent;package=com.google.android.apps.nbu.paisa.user;scheme=upi;end
      gPayIntent = `intent://upi/pay?${commonQuery}#Intent;package=com.google.android.apps.nbu.paisa.user;scheme=upi;end`;
    }

    // Return object (keep fields you used previously)
    return {
      id: response && response.id,           // if SDK returns id
      url: checkoutUrl,
      checkoutUrl,
      raw: response,
      phonePeDeepLink,
      gPayDeepLink,
      gPayIntent,
      upiDeepLink
    };
  } catch (err) {
    console.error('createPhonePePaymentLink error:', err);
    throw err;
  }
};

