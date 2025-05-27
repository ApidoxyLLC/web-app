import { dbConnect } from "./db";

export default async function authDbConnect() {
    const dbKey = "auth_db";
    const dbUri = process.env.MONGODB_URI

    if (!dbUri) {
        throw new Error("No URI provided for auth database");
    }

    return await dbConnect({dbKey, dbUri});
}