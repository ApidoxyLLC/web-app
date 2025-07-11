import { dbConnect } from "./db";
import config from "./config";

export default async function authDbConnect() {
    const dbKey = "auth_db";
    const dbUri = config.authDbUri

    if (!dbUri) {
        console.log("not found MONGODB_URI")
        throw new Error("No URI provided for auth database");
        }
    return await dbConnect({dbKey, dbUri});
}