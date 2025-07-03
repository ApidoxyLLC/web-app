import { userModel } from "@/models/auth/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import { NextResponse } from "next/server";
import sendEmail from "../mail/sendEmail";
import mongoose from "mongoose";
import { encrypt } from "@/lib/encryption/cryptoEncryption";
import { setSession } from "@/lib/redis/helpers/session";
import config from "../../../config";
import sendSMS from "../mail/sendSMS";

// Funcionality with database
export async function getUserByIdentifier({ db, session, data }) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid data format");
  }
  const { phone, email } = data || {};
  if (!email && !phone)
    throw new Error("At least one identifier (email or phone) is required.");

  const UserModel = userModel(db);
  try {
    const query = UserModel.findOne({ $or: [{ email }, { phone }] })
      .select(
        "+_id " +
          "+security " +
          "+security.password " +
          "+security.failedAttempts " +
          "+lock " +
          "+lock.isLocked " +
          "+lock.lockReason " +
          "+lock.lockUntil " +
          "+verification " +
          "+isEmailVerified " +
          "+isPhoneVerified " +
          "+role "
      )
      .lean();
    if (session) query.session(session);
    return await query;
  } catch (error) {
    throw new Error("something went wrong...");
  }
}

export async function getUserBySessionId({ db, session, data }) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid data format");
  }
  const { sessionId } = data || {};
  if (!sessionId)
    throw new Error("At least one identifier (email or phone) is required.");

  const User = userModel(db);
  try {
    const query = User.findOne({
      activeSessions: new mongoose.Types.ObjectId(sessionId),
      isDeleted: false,
    })
      .select("+activeSessions +shops")
      .lean();
    if (session) query.session(session);
    return await query;
  } catch (error) {
    throw new Error("something went wrong...");
  }
}

// export async function getUserSessionsIdById({ db, session, id}) {
//     const User = userModel(db);
//     const query = User.findById(id).lean();
//     if (session) query.session(session);
//     return await query;
// }

export async function createUser({ db, session, data }) {
  if (!data || typeof data !== "object") throw new Error("Invalid data format");

  const { name, email, phone, password } = data || {};
  const      UserModel = userModel(db);
  const           salt = await bcrypt.genSalt(14);
  const hashedPassword = await bcrypt.hash(password, salt);
  const          token = crypto.randomBytes(32).toString("hex");
  const    hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const            otp = crypto.randomInt(100000, 999999).toString();
  console.log("otp otp", otp)
  const      hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  const userData = {
    name,
    security: { ...(password && { password: hashedPassword, salt }) },
    verification: {
      ...(email && {
        emailVerificationToken: hashedToken,
        emailVerificationTokenExpiry: new Date(
          Date.now() + config.emailVerificationExpireMinutes * 60 * 1000
        ).getTime(),
      }),
      ...(phone &&
        !email && {
          phoneVerificationOTP: hashedOtp,
          phoneVerificationOTPExpiry: new Date(
            Date.now() + config.phoneVerificationExpireMinutes * 60 * 1000
          ).getTime(),
        }),
    },
    ...(email && { email }),
    ...(phone && { phone }),
  };

  const user = new UserModel(userData);
  const newUser = await user.save(session ? { session } : {});
  if (email) {
    const result = await sendEmail({
      receiverEmail: email,
      emailType: "VERIFY",
      senderEmail: "no-reply@apidoxy.com",
      token,
    });

    console.log("Email sent successfully:", result.messageId);
  }
  if (phone && !email) {
    const message = `Your Apidoxy verification code is: ${otp}. It will expire in ${config.phoneVerificationExpireMinutes} minutes.`;

    const result = await sendSMS({
      phone: phone,
      message,
    });

    console.log("OTP sent successfully:", result.messageId);
  }

  return newUser;
}

export async function addLoginSession({ db, session, data }) {
  //  ************************************************************** //
  //  input parameter "session" is the db transactions session       //
  //  don't mix with user's login session with transactions session  //
  //  "sessionId" inside data object is users login session's _id    //
  //  ************************************************************** //

  if (!data || typeof data !== "object") {
    throw new Error("Invalid data format");
  }
  const { userId, sessionId } = data || {};
  const User = userModel(db);
  const query = User.updateOne(
    { _id: userId },
    {
      $set: {
        "security.failedAttempts": 0,
        "lock.lockUntil": null,
        "security.lastLogin": new Date(),
      },
      $push: {
        activeSessions: {
          $each: [sessionId],
          $slice: -config.maxSessionsAllowed, // Keep last N elements
        },
      },
    },
    { upsert: true }
  );
  if (session) query.session(session);
  return await query;
}

export async function verifyPassword({ db, session, data }) {
  console.log(data);
  if (!data || typeof data !== "object") {
    throw new Error("Invalid data format");
  }
  const { user, password } = data || {};
  // if (user.lock?.lockUntil && user.lock.lockUntil > Date.now()) {
  //     return { status: false, reason: 'locked', message: 'Account is temporarily locked. Try again later.' };
  // }

  if (!user?.security?.password) {
    return {
      status: false,
      reason: "no_password",
      message: "Password not set.",
    };
  }
  const validPassword = await bcrypt.compare(password, user.security.password);
  if (!validPassword) {
    const newAttempts = (user.security?.failedAttempts || 0) + 1;
    const User = userModel(db);
    const updateQuery = User.updateOne(
      { _id: user._id },
      {
        $inc: { "security.failedAttempts": 1 },
        $set: { "lock.lockUntil": calculateLockTime(newAttempts) },
      }
    );
    if (session) updateQuery.session(session);
    await updateQuery;
    return {
      status: false,
      reason: "invalid_password",
      message: "Incorrect password.",
    };
  }
  return { status: true };
}

export default async function verifyEmailToken({ token }) {
  try {
    const db = await authDbConnect();
    const User = userModel(db);
    const user = await User.findOne({
      "verification.emailVerificationToken": token,
      "verification.emailVerificationTokenExpire": { $gt: Date.now() },
    });
    if (user) {
      const updatedUser = await User.findByIdAndUpdate(user._id, {
        $set: { isEmailVerified: true },
        $unset: {
          "verification.emailVerificationToken": 1,
          "verification.emailVerificationTokenExpiry": 1,
        },
      });
      if (updatedUser) {
        return { success: true, message: "Email successfully verified" };
      } else {
        return {
          success: false,
          message: "Something went wrong try again...!",
        };
      }
    } else {
      return { success: false, message: "Verificaiton Failed...!" };
    }
  } catch (error) {
    throw new Error("Something went wrong...");
  }
}

export async function handlePasswordReset({ token, newPassword, userId }) {
  if (!token || !newPassword || !userId)
    return { success: false, message: "Missing required fields." };

  const db = await authDbConnect();
  const User = userModel(db);
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  const updatedUser = await User.findOneAndUpdate(
    {
      _id: userId,
      "security.forgotPasswordToken": token,
      "security.forgotPasswordTokenExpire": { $gt: Date.now() },
    },
    {
      $set: {
        "security.password": hashedPassword,
        "security.salt": salt,
      },
      $unset: {
        "security.forgotPasswordToken": 1,
        "security.forgotPasswordTokenExpire": 1,
      },
    },
    { new: true }
  );
  if (updatedUser) {
    // TODO: Optionally invalidate sessions or log audit
    return { success: true, message: "Password updated successfully." };
  } else {
    return { success: false, message: "Invalid or expired token." };
  }

  // try {
  //     const   db = await authDbConnect();
  //     const User = userModel(db);
  //     const user = await User.findById(userId);

  //     if (!user) {
  //         return { success: false, message: "Invalid user" };
  //     }

  //     const tokenValid = user.security?.forgotPasswordToken &&
  //                        user.security?.forgotPasswordTokenExpiry > Date.now();

  //     if (!tokenValid) {
  //         return { success: false, message: "Invalid or expired token" };
  //     }

  //     const isTokenMatch = await bcrypt.compare(token, user.security.forgotPasswordToken);
  //     if (!isTokenMatch) {
  //         return { success: false, message: "Invalid token" };
  //     }

  //     const hashedPassword = await bcrypt.hash(newPassword, 10);
  //     const updatedUser = await User.findByIdAndUpdate(userId, {
  //         $set: {
  //             "security.password": hashedPassword
  //         },
  //         $unset: {
  //             "security.forgotPasswordToken": 1,
  //             "security.forgotPasswordTokenExpiry": 1
  //         }
  //     });

  //     if(updatedUser) return { success: true, message: "Password updated successfully" };
  //     else return { success: false, message: "Sorry password can't update...!" };

  // } catch (error) {
  //     return { success: false, message: "Password reset failed. Please try again later." };
  // }

  // const salt = await bcrypt.genSalt(10);
  // const hashedPassword = await bcrypt.hash(newPassword, salt);
  // const updatedUser = await User.findOneAndUpdate({  _id: userId,
  //                         "security.forgotPasswordToken": token,
  //                   "security.forgotPasswordTokenExpire": { $gt: Date.now() }},
  //         {   $set:   {              "security.password": hashedPassword,
  //                                        "security.salt": salt,  },
  //             $unset: {   "security.forgotPasswordToken": 1,
  //                   "security.forgotPasswordTokenExpire": 1      }        })
  // if(updatedUser) return { success: true, message: "password updated successfully" };
  // else return { success: false, message: "Sorry password can't update...!" };
}

// Simple Tools
export function checkLockout(user) {
  if (user.lock?.lockUntil && user.lock.lockUntil > Date.now()) {
    const retryAfter = Math.ceil((user.lock.lockUntil - Date.now()) / 1000);
    throw new Error(`Account temporarily locked, try again in ${retryAfter}`);
  }
}

export function checkVerification({ user, identifier }) {
  const requiresVerification =
    (identifier === user.email && !user.isEmailVerified) ||
    (identifier === user.phone && !user.isPhoneVerified) ||
    (identifier === user.username &&
      !(user.isEmailVerified || user.isPhoneVerified));

  if (requiresVerification) throw new Error("Account verification required");
}

export function createAccessToken({ user, sessionId, secret, expire }) {
  if (!secret) throw new Error("Missing Token secret...!");
  const expire_ms = Number(expire) * 60 * 1000;
  const token = jwt.sign(
    {
      sessionId: sessionId,
      // userId: user._id.toString(),
      ...(user.email && { email: user.email }),
      ...(user.phone && { phone: user.phone }),
    },
    secret,
    { expiresIn: expire_ms / 1000 }
  );

  const expireAt = new Date(Date.now() + expire_ms);

  return { token, expireAt };
}

export function createRefreshToken({ expire }) {
  const REFRESH_TOKEN_EXPIRE_MS = Number(expire) * 60 * 1000;
  const token = crypto.randomBytes(64).toString("hex");
  const expireAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRE_MS);
  return { token, expireAt };
}

function calculateLockTime(failedAttempts) {
  if (failedAttempts > config.maxLoginAttempt)
    return NextResponse.json(
      { success: false, error: "Too many attempts. Please try again later" },
      { status: 429 }
    );

  return new Date(
    Date.now() +
      Math.pow(2, failedAttempts - config.maxLoginAttempt) * 60 * 1000
  );
}

export async function generateAccessTokenWithEncryption({
  user,
  sessionId,
  userId,
  role = [],
}) {
  if (!user || !sessionId || !userId)
    throw new Error("MISSING_REQUIRED_PARAMS");
  // ✅ Token generation
  const tokenId = crypto.randomBytes(16).toString("hex");
  const expireMs = config.accessTokenExpireMinutes * 60 * 1000;
  const payload = {
    sessionId,
    ...(user.email && { email: user.email }),
    ...(user.phone && { phone: user.phone }),
    tokenId,
    tokenType: "access",
    iat: Math.floor(Date.now() / 1000),
  };

  const accessToken = jwt.sign(payload, config.accessTokenSecret, {
    expiresIn: config.accessTokenExpireMinutes * 60,
  });
  const accessTokenExpAt = new Date(Date.now() + expireMs);

  // Store data to redis memory
  await setSession({
    token: tokenId,
    data: { ...payload, userId, sessionId, role },
  });

  let accessTokenCipherText;
  try {
    accessTokenCipherText = await encrypt({
      data: accessToken,
      options: { secret: config.accessTokenEncryptionKey },
    });
  } catch (err) {
    throw new Error("TOKEN_ENCRYPTION_FAILED");
  }
  return {
    tokenId,
    accessToken,
    accessTokenExpAt,
    accessTokenCipherText,
  };
}

export async function generateRefreshTokenWithEncryption() {
  const expireMs = config.refreshTokenExpireMinutes * 60 * 1000;
  const refreshToken = crypto.randomBytes(128).toString("hex");
  const refreshTokenExpAt = new Date(Date.now() + expireMs).toISOString();
  let refreshTokenCipherText;
  try {
    refreshTokenCipherText = await encrypt({
      data: refreshToken,
      options: { secret: config.refreshTokenEncryptionKey },
    });
  } catch (err) {
    throw new Error("REFRESH_TOKEN_ENCRYPTION_FAILED");
  }

  return {
    refreshToken,
    refreshTokenExpAt,
    refreshTokenCipherText,
  };
}

export async function generateTokenWithEncryption({ user, sessionId }) {
  const { token: accessToken, expireAt: accessTokenExpAt } = createAccessToken({
    user,
    sessionId,
    secret: config.accessTokenSecret,
    expire: config.accessTokenExpireMinutes,
  });

  const { token: refreshToken, expireAt: refreshTokenExpAt } =
    createRefreshToken({ expire: config.refreshTokenExpireMinutes });

  const accessTokenCipherText = await encrypt({
    data: accessToken,
    options: { secret: config.accessTokenEncryptionKey },
  });

  const refreshTokenCipherText = await encrypt({
    data: refreshToken,
    options: { secret: config.refreshTokenEncryptionKey },
  });
  return {
    accessToken,
    accessTokenExpAt,
    refreshToken,
    refreshTokenExpAt,
    accessTokenCipherText,
    refreshTokenCipherText,
  };
}
