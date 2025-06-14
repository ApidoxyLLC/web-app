import { getToken } from "next-auth/jwt";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/__option";
import authDbConnect from "@/app/lib/mongodb/authDbConnect";
import { userModel } from "@/models/auth/User";
import mongoose from "mongoose";

export async function authenticateUser(request) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  await getServerSession(authOptions);
  if (!token || !token.session || !mongoose.Types.ObjectId.isValid(token.session))
    return { success: false, status: 401, response: { success: false, error: 'Not authorized' } };
  const authDb = await authDbConnect();
  const User = userModel(authDb);
  const user = await User.findOne({ activeSessions: new mongoose.Types.ObjectId(token.session),
                                         isDeleted: false                                       })
                         .select('+_id +activeSessions +shops').lean();
  if (!user)
    return { success: false, status: 400, response: { success: false, error: 'Authentication failed' } };
  return { success: true, user, sessionId: token.session };
}