import { dbConnect } from "./db";
import config from "./config";

export default async function vendorDbConnect() {
    const dbKey = "vendor_db";
    const dbUri = config.vendorDbUri

    if (!dbUri) {
        console.log("not found MONGODB_URI")
        throw new Error("No URI provided for auth database");
        }
    return await dbConnect({dbKey, dbUri});
}