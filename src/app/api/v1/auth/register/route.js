import authDbConnect from "@/lib/mongodb/authDbConnect";
// import User from "@/models/auth/User";
import { NextResponse } from "next/server";
import registerDTOSchema from "./registerDTOSchema";
import { createUser, getUserByIdentifier } from "@/services/auth/user.service";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";

export async function POST(request) {
  let body;
  try { body = await request.json(); } 
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // Rate limiting 
  const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'register' });
  if (!allowed) return NextResponse.json( { message: `Too many requests. Retry after ${retryAfter}s.` }, { status: 429 });

  // Validation with zod
  const parsed = registerDTOSchema.safeParse(body);
  if (!parsed.success) 
    return NextResponse.json({ error: "Invalid data..." }, { status: 422 });

  const { name, email, phone, password } = parsed?.data
  if (!email && !phone) 
    return NextResponse.json({ error: "Missing data ..." }, { status: 422 });

  if(password){
    // add more containing common password
    const commonPasswords = ['password', '12345678', 'qwerty123'];
    if (commonPasswords.includes(password.toLowerCase())) return NextResponse.json({ error: "Common password provided, change the password" }, { status: 422 });
  }

  const auth_db = await authDbConnect();
  const session = await auth_db.startSession();

  try {
    session.startTransaction();
    const existingUser = await getUserByIdentifier({db: auth_db, session, data: { phone, email } })

    if(existingUser)
      return NextResponse.json({ error: "User already Exist" }, { status: 409 });    

    const user = await createUser({  db: auth_db, session, 
                                data: {  name, email, phone, password } })
    const { role, theme, language, timezone, currency, plan } = user
    const userResponse = {  name, email, phone, role,
                            local: { theme, language, timezone, currency, plan } };
    await session.commitTransaction();
    return NextResponse.json({ message: "User registered successfully", success: true, data: userResponse }, { status: 201 })
  } catch (error) {
      await session.abortTransaction();
      return NextResponse.json({ error: error.message || "Something went wrong", stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined }, { status: 500 });
  } finally{
    session.endSession();
  }
}