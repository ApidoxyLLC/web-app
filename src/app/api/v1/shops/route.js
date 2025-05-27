import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/option";
import { NextResponse } from "next/server";
import { createShopDTOSchema } from "./schema/createShopDTOSchema";
import mongoose from "mongoose";
import { dbConnect } from "@/app/lib/mongodb/db";

import shopDbConnect from "@/app/lib/mongodb/shopDbConnect";
import authDbConnect from "@/app/lib/mongodb/authDbConnect";
import { createShop } from "@/services/primary/shop.service";


export async function POST(request, response) {

  // let body;
  // try {
  //   body = await request.json();
  // } catch {
  //   return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  // }


  // Task Need to be done 
  // 
  // 1. Authenticate user (only a valid user can create a Shop)
  // const user_unique_identifier = 
  // 2. Check user's Authorization and limitation to create shop


  // 
  // 3. Extract Data from body
  // 
  // 4. sanitize users Input data with zod 

  // const parsed = createShopDTOSchema.safeParse(body);
  // if (!parsed.success) {
  //   return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  // }
  // const country = parsed.data.country.trim();
  // const industry = parsed.data.industry?.trim();
  // const businessName = parsed.data.businessName?.trim();
  // const location = parsed.data.location;

  

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

    try {
        const shopId = new mongoose.Types.ObjectId();
        const data = {
          _id: shopId,
          ownerId: new mongoose.Types.ObjectId(),
          ownerLoginSession: new mongoose.Types.ObjectId(),
          country: "Sample Country",
          industry: "Sample Industry",
          businessName: "Sample Business Name",
          location: "Sample Location",
        }

        // console.log(data)
        const auth_db = await authDbConnect()
        const shop = await createShop({ db: auth_db, data: data })
        return NextResponse.json({
            message: "Shop created successfully",
            success: true,
            data: shop
          }, { status: 201 })

        
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