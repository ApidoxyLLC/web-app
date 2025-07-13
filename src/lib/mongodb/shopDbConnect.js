import { dbConnect } from "./db";

export default async function shopDbConnect(id) {
    const dbKey = `${process.env.SHOP_DB_PREFIX || 'shop'}_${id}_db`;
    const dbUri = process.env.MONGODB_URI
    if (!dbUri) {
        throw new Error("No URI provided for auth database");
    }
    return await dbConnect({dbKey, dbUri});
}