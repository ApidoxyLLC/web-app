import authDbConnect from "@/lib/mongodb/authDbConnect";
import { NextResponse } from "next/server";
import registerDTOSchema from "./registerDTOSchema";
import { createUser } from "@/services/auth/user.service";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import getUserByIdentifier from "@/services/user/getUserByIdentifier";

export async function POST(request) {
  let body;
  try { body = await request.json()} 
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  // Rate limiting
  // const ip = request.ip || request.headers["x-forwarded-for"]?.split(",")[0]?.trim() || request.headers["x-real-ip"] || request.socket?.remoteAddress || "unknown";
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || request.socket?.remoteAddress || "unknown";
  const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: "register" });
  if (!allowed) 
    return NextResponse.json( { message: `Too many requests. Retry after ${retryAfter}s.` }, { status: 429 });

  // Validation with zod
  const parsed = registerDTOSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid data..." }, { status: 422 });
  console.log(parsed.data)
  const { name, email, phone, password } = parsed?.data;
  if (!email && !phone)
    return NextResponse.json({ error: "Missing data ..." }, { status: 422 });

  // Common password check will resume later
  // if(password){
  //   // add more containing common password
  //   const commonPasswords = ['password', '12345678', 'qwerty123'];
  //   if (commonPasswords.includes(password.toLowerCase())) return NextResponse.json({ error: "Common password provided, change the password" }, { status: 422 });
  // }
  const auth_db = await authDbConnect();
  const requiredCollections = ['users', 'sessions', 'login_histories'];
  // Get existing collection names in the current database
  const existingCollections = (await auth_db.db.listCollections().toArray()).map(col => col.name);
  // Create missing collections
  for (const name of requiredCollections) {
      if (!existingCollections.includes(name)) 
          await auth_db.createCollection(name);
  }
  const existingUser = await getUserByIdentifier({ auth_db, payload: { email, phone } });
  if (existingUser)
        return NextResponse.json({ error: "User already Exist" }, { status: 409 });
      
  
  const session = await auth_db.startSession();

  try {
    session.startTransaction();
    const user = await createUser({ db: auth_db, session, data: { name, email, phone, password } });
    const { role, theme, language, timezone, currency, plan } = user;
    const responseData = { name, email, phone, role, local: { theme, language, timezone, currency, plan },};
    await session.commitTransaction();
    return NextResponse.json( { message: "User registered successfully", success: true, data: responseData }, { status: 201 });
  } catch (error) {
    console.log(error)
    await session.abortTransaction();
    return NextResponse.json({ error: error.message || "Something went wrong", stack: process.env.NODE_ENV !== "production" ? error.stack : undefined, }, { status: 500 } );
  } finally { session.endSession(); }
}
