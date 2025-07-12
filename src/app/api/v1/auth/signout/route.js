import { userModel } from "@/models/auth/User";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import { sessionModel } from "@/models/auth/Session";
import getCleanCookies from "../utils/getCleanCookies";
import verifyCsrfToken from "../utils/verifyCsrfToken";
import { revokeSession, validateSession } from "@/lib/redis/helpers/session";
import getAuthenticatedUser from "../utils/getAuthenticatedUser";

export async function POST(req) {
  try {
      const csrfVerified = verifyCsrfToken(req)
      if (!csrfVerified){
          return new Response(JSON.stringify({ error: "Invalid CSRF token" }), { status: 403, headers: { "Content-Type": "application/json", "Set-Cookie": getCleanCookies() }})
      }
      
      const { authenticated, error, data } = await getAuthenticatedUser(req);
      if(!authenticated){
          return new Response(JSON.stringify({ error: "Unauthenticated" }), {status: 401,headers: { "Content-Type": "application/json", "Set-Cookie": getCleanCookies()}})}
      const          db = await authDbConnect();
      const        User = userModel(db);
      const     Session = sessionModel(db);
      const userSession = await Session.findById(data.sessionId)
                                       .select("refreshToken userId userReference")
                                       .lean();
      if (!userSession) {
          return new Response(JSON.stringify({ error: "Invalid request" }), { status: 404, headers: { "Content-Type": "application/json", "Set-Cookie": getCleanCookies()}})}

      const dbSession = await db.startSession();
      const results = { redisSessionRevoked: false,
                           sessionDeleted: false,
                              userUpdated: false };

      try {
          await dbSession.withTransaction(async () => {
            const revoked = await revokeSession({ sessionId: data.sessionId, 
                                                userId: userSession.userReference });
            if(!revoked) throw new Error("Internal server error");
            results.redisSessionRevoked = true;

            const sessionDeleteResult = await Session.deleteOne( { _id: userSession._id }, { session: dbSession })
            if(sessionDeleteResult)                                       
              results.sessionDeleted = sessionDeleteResult.deletedCount > 0;
            const    userUpdateResult = await    User.updateOne( {    _id: userSession.userId }, 
                                                                 {  $pull: { activeSessions: userSession._id } },
                                                                 { session: dbSession } )
            if(userUpdateResult)
              results.userUpdated    = userUpdateResult.modifiedCount > 0;

          if (!results.sessionDeleted || !results.userUpdated) 
            throw new Error("Failed to update database records");
          
          }, { readPreference: 'primary' });
      } catch (error) {
        return new Response( JSON.stringify({ error: "Failed to complete sign-out", details: error.message, }), { status: 500, headers: {"Content-Type": "application/json", "Set-Cookie": getCleanCookies(),},});
      } finally { await dbSession.endSession() }

    // Successful response
    const headers = new Headers([ ["Content-Type", "application/json"], ...getCleanCookies().map((cookie) => ["Set-Cookie", cookie]) ]);
    return new Response(JSON.stringify({ message: "Sign-out successful", results }), { status: 200, headers } );
  } catch (error) {
    console.error("Unexpected error in sign-out:", error);
    return new Response( JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json", "Set-Cookie": getCleanCookies() },});
  }
}



// import { getToken } from "next-auth/jwt";
// import { userModel } from "@/models/auth/User";
// import authDbConnect from "@/lib/mongodb/authDbConnect";
// import { sessionModel } from "@/models/auth/Session";
// import { serialize } from "cookie";
// import { isValidObjectId } from "mongoose";
// import mongoose from "mongoose";
// import jwt from "jsonwebtoken";
// import config from "../../../../../../config";
// import bcrypt from "bcryptjs";
// import { revokeSession, validateSession } from "@/lib/redis/helpers/session";

// export async function POST(req) {
//     const token = await getToken({ req });
//     if (!token || !token.sessionId || !isValidObjectId(token.sessionId)) {
//         return new Response(JSON.stringify({ error: "Unauthorized or invalid session" }), { status: 401 });
//     }

//     let db, User, Session, userSession, decoded, redisSession;
    
//     try {
//         db = await authDbConnect();
//         User = userModel(db);
//         Session = sessionModel(db);
        
//         userSession = await Session.findById(token.sessionId).select('tokenId refreshToken userId').lean();
//         if (!userSession) {
//             return new Response(JSON.stringify({ error: "Session not found" }), { status: 404 });
//         }

//         decoded = jwt.verify(token.accessToken, config.accessTokenSecret);
//         const isTokenIdValid = await bcrypt.compare(decoded.tokenId, userSession.tokenId);
//         const isRefreshTokenValid = await bcrypt.compare(token.refreshToken, userSession.refreshToken);
        
//         redisSession = await validateSession({ sessionId: token.sessionId, tokenId: decoded.tokenId });
        
//         if (!redisSession || !isTokenIdValid || !isRefreshTokenValid) {
//             return new Response(JSON.stringify({ error: "Unauthorized request" }), { status: 401 });
//         }
//     } catch (error) {
//         console.error("Session validation error:", error);
//         return new Response(JSON.stringify({ error: "Unauthorized or invalid session" }), { status: 401 });
//     }

//     const session = await db.startSession();
//     const results = {
//         redisSessionRevoked: false,
//         sessionDeleted: false,
//         userUpdated: false,
//         errors: []
//     };

//     try {
//         await session.withTransaction(async () => {
//             // Redis operation (outside transaction but we'll handle failures)
//             try {
//                 await revokeSession({ sessionId: token.sessionId, userId: decoded.sub });
//                 results.redisSessionRevoked = true;
//             } catch (error) {
//                 await session.abortTransaction();
//                 throw error;
//             }

//             // MongoDB operations (inside transaction)
//             try {
//                 await Session.deleteOne({ _id: token.sessionId }, { session });
//                 results.sessionDeleted = true;

//                 await User.updateOne(
//                     { _id: userSession.userId }, 
//                     { $pull: { activeSessions: new mongoose.Types.ObjectId(token.sessionId) } },
//                     { session }
//                 );
//                 results.userUpdated = true;
//             } catch (error) {
//                 await session.abortTransaction();
//                 throw error;
//             }
//         });
//     } catch (err) {
//         results.errors.push({ task: "transaction", error: err.message });
//         console.error("Transaction error:", err);
//     } finally {
//         await session.endSession();
//     }

//     // If Redis succeeded but MongoDB failed, we have an inconsistency
//     if (results.redisSessionRevoked && (!results.sessionDeleted || !results.userUpdated)) {
//         console.error("Inconsistent state: Redis session revoked but MongoDB operations failed");
//         // Consider implementing a recovery mechanism here
//     }

//     // Cookie cleanup (always execute)
//     const headers = new Headers();
//     const cookieNames = [
//         "next-auth.session-token",
//         "__Secure-next-auth.session-token",
//         "next-auth.csrf-token",
//         "next-auth.callback-url"
//     ];

//     cookieNames.forEach((cookieName) => {
//         headers.append(
//             "Set-Cookie",
//             serialize(cookieName, "", {
//                 path: "/",
//                 expires: new Date(0),
//                 httpOnly: true,
//                 secure: cookieName.startsWith("__Secure"),
//             })
//         );
//     });

//     headers.set("Content-Type", "application/json");

//     return new Response(
//         JSON.stringify({ 
//             message: results.errors.length ? "Sign-out completed with warnings" : "Sign-out successful",
//             results 
//         }),
//         { status: results.errors.length ? 207 : 200, headers }
//     );
// }
