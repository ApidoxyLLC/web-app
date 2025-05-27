import { shopModel } from "@/models/shop/Shop";


export async function createShop({ db, session, data }) {
  try {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format');
    }

    // const requiredFields = ['shopId', 'ownerId', 'sessionId', 'country', 'industry', 'businessName', 'location'];
    // for (const field of requiredFields) {
    //   if (!data[field]) throw new Error(`Missing field: ${field}`);
    // }

    const Shop = shopModel(db);
    const newShop = new Shop(data);
    return await newShop.save(session ? { session } : {});
  } catch (error) {
    console.error('Error in createShop:', error);
    throw new Error('Shop creation failed: ' + error.message);
  }
}