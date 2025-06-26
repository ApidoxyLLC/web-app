import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/option";
import { NextResponse } from "next/server";
import { createShopDTOSchema } from "./createShopDTOSchema";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb/db";
import shopDbConnect from "@/lib/mongodb/shopDbConnect";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import { createShop } from "@/services/auth/shop.service";
import { encrypt } from "@/lib/encryption/cryptoEncryption";
import { getUserByIdentifier } from "@/services/auth/user.service";
import { getToken } from "next-auth/jwt";
import { randomBytes, createHmac } from 'crypto';



export async function POST(request, response) {
    // const host = request.headers.get('host');
    // const origin = request.headers.get('origin');

    const secret = process.env.NEXTAUTH_SECRET;
    const token = await getToken({ req:request, secret });
    const user_auth_session = await getServerSession(authOptions)





    
    if(!user_auth_session && !token) 
        return NextResponse.json({ error: "...not authorized" }, { status: 401 });    
    // if(user_auth_session){
    //     console.log(user_auth_session)
    //     console.log("has session")
    //     const { email, phone, role } = user_auth_session.user
    //     const auth_db = await authDbConnect()
    //     console.log(token)
    //     NextResponse.json({ success: true,  data:user_auth_session, message: "Session Found" }, { status: 200 });
    // }
    

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }


  // Task Need to be done 
  // 
  // 1. Authenticate user (only a valid user can create a Shop)
  // const user_unique_identifier = 
  // 2. Check user's Authorization and limitation to create shop


  // 
  // 3. Extract Data from body
  // 
  // 4. sanitize users Input data with zod 

  const parsed = createShopDTOSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const country = parsed.data.country.trim();
  const industry = parsed.data.industry?.trim();
  const businessName = parsed.data.businessName?.trim();
  const location = parsed.data.location;

  

  // Temporary generate 
  // this will grab from users sessionId stored into accessToken
  // Need to check the users loggedin session from sessions collection on auth_db
  // const sessionId = new mongoose.Types.ObjectId();
  // const ownerId = new mongoose.Types.ObjectId();
    // schema structure  
    // {
    //    shopId: sessionId
    //    dbClauster: 
    //    dbSecret:
    //    dbNamePrefix: 
    // }

    // const dbSchema = new mongoose.Schema({
    //     provider: { type: String, default: 'mongodb' },
    //     uri: { type: String, default: '' },
    //     cluster
    // }, { timestamps: false });
    
    // const keySchema = new mongoose.Schema({
    //            ACCESS_TOKEN_SECRET: { type: String, required: true },
    //           REFRESH_TOKEN_SECRET: { type: String, required: true }, 
    
    //    ACCESS_TOKEN_EXPIRE_MINUTES: { type: Number, required: true, default: Number(process.env.END_USER_ACCESS_TOKEN_DEFAULT_EXPIRE_MINUTES || 15 ) }, 
    //   REFRESH_TOKEN_EXPIRE_MINUTES: { type: Number, required: true, default: Number(process.env.END_USER_REFRESH_TOKEN_DEFAULT_EXPIRE_MINUTES || 10080) }, 
     
    // }, { timestamps: false })


    const _sample_ownerId = new mongoose.Types.ObjectId();

    // const encodingFormates = [ 'hex', 'base64' ];
    // const keyLengths  = [ 32, 64 ]

    


    const                         ACCESS_TOKEN_SECRET = crypto.randomBytes(32).toString('base64');
    const END_USER_ACCESS_TOKEN_SECRET_ENCRYPTION_KEY = process.env.END_USER_ACCESS_TOKEN_SECRET_ENCRYPTION_KEY
    const                 accessTokenSecretCipherText = await encrypt({    data: ACCESS_TOKEN_SECRET,
                                                                        options: { secret: END_USER_ACCESS_TOKEN_SECRET_ENCRYPTION_KEY }      });

    const                         REFRESH_TOKEN_SECRET = crypto.randomBytes(64).toString('hex');
    const END_USER_REFRESH_TOKEN_SECRET_ENCRYPTION_KEY = process.env.END_USER_REFRESH_TOKEN_SECRET_ENCRYPTION_KEY                                           
    const                 refreshTokenSecretCipherText = await encrypt({ data: REFRESH_TOKEN_SECRET,
                                                                      options: { secret: END_USER_REFRESH_TOKEN_SECRET_ENCRYPTION_KEY }      });
    
    const         shopId = new mongoose.Types.ObjectId();
    const SHOP_DB_PREFIX = process.env.SHOP_DB_PREFIX
    const     shopDbName = SHOP_DB_PREFIX + shopId

    const        VENDOR_DB_DEFAULT_URI = process.env.VENDOR_DB_DEFAULT_URI+'/'+shopDbName
    const VENDOR_DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY
    const              dbUriCipherText = await encrypt({     data: VENDOR_DB_DEFAULT_URI,
                                                          options: { secret: VENDOR_DB_URI_ENCRYPTION_KEY }      });

    // const VENDOR_DB_NAME_ENCRYPTION_KEY = process.env.VENDOR_DB_NAME_ENCRYPTION_KEY
    // const dbNameCipherText = await encrypt({ data: shopDbName,
    //                                       options: { secret: VENDOR_DB_NAME_ENCRYPTION_KEY }      });

    // const DB_PROVIDER = process.env.VENDOR_DB_PROVIDER
    // const DB_URI = process.env.VENDOR_DB_DEFAULT_URI

    const       ACCESS_TOKEN_EXPIRE_MINUTES = Number(process.env.END_USER_ACCESS_TOKEN_DEFAULT_EXPIRE_MINUTES)  || 30
    const      REFRESH_TOKEN_EXPIRE_MINUTES = Number(process.env.END_USER_REFRESH_TOKEN_DEFAULT_EXPIRE_MINUTES) || 10080
    const EMAIL_VERIFICATION_EXPIRE_MINUTES = Number(process.env.END_USER_EMAIL_VERIFICATION_EXPIRE_MINUTES)    || 10
    const PHONE_VERIFICATION_EXPIRE_MINUTES = Number(process.env.END_USER_PHONE_VERIFICATION_EXPIRE_MINUTES)    || 3

    try {
        const data = {
              _id: shopId,
         vendorId: new mongoose.Types.ObjectId(),
          ownerId: _sample_ownerId,
ownerLoginSession: new mongoose.Types.ObjectId(),
          country: country,
         industry: industry,
     businessName: businessName,
         location: location,
           dbInfo:  { 
                    provider: VENDOR_DEFAULT_DB_PROVIDER,
                         uri: dbUriCipherText,
                      prefix: SHOP_DB_PREFIX
                    },
             keys:  {    ACCESS_TOKEN_SECRET: accessTokenSecretCipherText,
                        REFRESH_TOKEN_SECRET: refreshTokenSecretCipherText,
                  //  EMAIL_VERIFICATION_SECRET: emailVerificationCipherText
                    },
  timeLimitations:  {
                        EMAIL_VERIFICATION_EXPIRE_MINUTES,
                        PHONE_VERIFICATION_EXPIRE_MINUTES,
                        ACCESS_TOKEN_EXPIRE_MINUTES,
                        REFRESH_TOKEN_EXPIRE_MINUTES                        
                    }
        }

        const shop = await createShop({ db: auth_db, data: data })
        


        return NextResponse.json({ message: "Shop created successfully", success: true, data: shop }, { status: 201 })
    } catch (error) {
      return NextResponse.json({
              error: error.message || "Shop Not created",
              stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            }, { status: 500 });
    }


  // 
  // 5. Create (dynamically) New Database with necessery collections for the shop 

  // 6. connect to that new database
  // 7. Store basic information into collection named "shop" into that new database 
  // 8. connect to applications main database
  // 9. Update Shop Information to the User's Collection
  // 10. send success message 





    // const session = await getServerSession(authOptions)

    // if(session){
    //     console.log(session)
    //     console.log("has session")
    // }
    




//   const body = await req.json();
//   const { name } = body;

//   if (!name) {
//     return new Response(JSON.stringify({ error: 'Name is required' }), { status: 400 });
//   }

//   const newItem = { id: Date.now(), name };
//   items.push(newItem);
//   return new Response(JSON.stringify("newItem"), { status: 201 });
  return new NextResponse(JSON.stringify({response: "sample response "}), { status: 201 });

}

// export async function GET() {
//   return Response.json(items);
// }

// export async function PATCH(req) {
//   const body = await req.json();
//   const { id, name } = body;

//   const index = items.findIndex(item => item.id === Number(id));
//   if (index === -1) {
//     return new Response(JSON.stringify({ error: 'Item not found' }), { status: 404 });
//   }

//   if (name) items[index].name = name;
//   return Response.json(items[index]);
// }

// export async function DELETE(req) {
//   const body = await req.json();
//   const { id } = body;

//   const index = items.findIndex(item => item.id === Number(id));
//   if (index === -1) {
//     return new Response(JSON.stringify({ error: 'Item not found' }), { status: 404 });
//   }

//   const deleted = items.splice(index, 1);
//   return Response.json(deleted[0]);
// }


async function createAppDatabase(dbName) {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) throw new Error('MONGODB_URI is not defined');
  let conn;
  try {
    conn = await dbConnect({dbKey: dbName, dbUri: MONGODB_URI})
    const shopCollections = [
                                  'shops',
                                  'shop_users',
                                  'shop_sessions',
                                  'shop_login_histories',
                                  'products',
                                  'categories',
                                  'carts',
                                  'rating_reviews',
                                  'delivery_partners'
                                ];

    // Create collections
    await Promise.all(
      shopCollections.map(collectionName =>
        conn.db.createCollection(collectionName)
      )
    );

    console.log(`Database '${dbName}' initialized with ${shopCollections.length} collections`);
    return { success: true, dbName };
  } catch (error) {
    console.error('Database creation failed:', error);
    throw new Error(`Database setup failed: ${error.message}`);
  } finally {
    if (conn) {
      await conn.close();
      console.log('Temporary connection closed');
    }
  }
}