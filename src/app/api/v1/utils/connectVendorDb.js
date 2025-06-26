import { dbConnect  } from "@/lib/mongodb/db";
import { decrypt    } from "@/lib/encryption/cryptoEncryption";

export async function connectVendorDb(shop) {
    const DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
    if (!DB_URI_ENCRYPTION_KEY){ 
        console.log("not found DB_URI_ENCRYPTION_KEY")
        throw new Error('Server configuration error'); 
    }       
    const dbUri = await decrypt({ cipherText: shop.dbInfo.uri, options: { secret: DB_URI_ENCRYPTION_KEY } });
    const dbKey = `${shop.dbInfo.prefix}${shop._id}`;
    return await dbConnect({ dbKey, dbUri });
}