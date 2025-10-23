import { StandardCheckoutClient, Env, MetaInfo, StandardCheckoutPayRequest } from 'pg-sdk-node';
import { randomUUID } from 'crypto';
 
const clientId = "SU2510211701005174659756";
const clientSecret = "f9f47f30-a2bf-48cf-b980-0d7627f2739a";
const clientVersion = 1;    //insert your client version here
const env =  Env.PRODUCTION;       //change to Env.PRODUCTION when you go live
 
const client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);
 


/**
 * Create PhonePe Payment Link
 * @param {number} amount - Amount in rupees
 * @param {string} redirectUrl - URL to redirect after payment
 * @param {string} udf1 - Optional user-defined field 1
 * @param {string} udf2 - Optional user-defined field 2
 * @returns {Promise<string>} - Returns the checkout page URL
 */
 export const  createPhonePePaymentLink = async({ amount, redirectUrl, udf1 = '', udf2 = '' }) =>  {
  try {
    const merchantOrderId = randomUUID();

    const metaInfo = MetaInfo.builder()
      .udf1(udf1)
      .udf2(udf2)
      .build();

    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(amount)
      .redirectUrl(redirectUrl)
      .metaInfo(metaInfo)
      .build();

    const response = await client.pay(request);
    const checkoutPageUrl = response.redirectUrl;

    return checkoutPageUrl;
  } catch (error) {
    console.error("Error creating PhonePe payment link:", error);
    throw new Error(error.message || "Failed to create payment link");
  }
}

