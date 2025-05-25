import User from "@/models/auth/User";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto'; 

export async function getUserByIdentifier({name, value}) {
    const user =  await User.findOne({ [name]: value })
                        .select('+security.password ' +
                                '+security.failedAttempts ' +
                                '+lock.lockUntil ' +
                                '+verification ' +
                                '+activeSessions' ).lean()

    console.log(user)
    return user
}

export async function getUserSessionsIdById(id) {
    return await User.findById(id).select('activeSessions').lean();
}

export async function verifyPassword({user, password}) {
    const validPassword = await bcrypt.compare(password, user.security.password);
    if (!validPassword) {
        const newAttempts = (user.security?.failedAttempts || 0) + 1;
        await User.updateOne(
            { _id: user._id },
            {
                $inc: { "security.failedAttempts": 1 },
                $set: { "lock.lockUntil": calculateLockTime(newAttempts) }
            }
        );
        return false;
    }
    return true;
}

export async function updateUserLoginSession({user, loginSession, transactionSession}){
    const MAX_SESSIONS_ALLOWED = Math.abs(Number(process.env.MAX_SESSIONS_ALLOWED)) || 3;
    return await User.updateOne(   { _id: user._id },
                            {   $set: {
                                        "security.failedAttempts": 0,
                                        "lock.lockUntil": null,
                                        "security.lastLogin": new Date()
                                        },
                               $push: { 
                                        activeSessions: {
                                            $each: [loginSession._id],
                                            $slice: -MAX_SESSIONS_ALLOWED // Keep last N elements
                                        }
                                    }
                            }
                    ).session(transactionSession); 
}

export function checkLockout(user) {
    if (user.lock?.lockUntil && user.lock.lockUntil > Date.now()) {
        const retryAfter = Math.ceil( (user.lock.lockUntil - Date.now()) / 1000);
        throw new Error( `Account temporarily locked, try again in ${retryAfter}`, );
    }
}

export function checkVerification({user, identifier}) {
    const requiresVerification =
        (identifier === user.email && !user.verification.isEmailVerified) ||
        (identifier === user.phone && !user.verification.isPhoneVerified) ||
        (identifier === user.username && !(user.verification.isEmailVerified || user.verification.isPhoneVerified));

    if (requiresVerification) throw new Error("Account verification required");
}

export function createAccessToken({user, sessionId, secret, expire }){

    if (!secret) throw new Error("Missing Token secret...!");
    const expire_ms = Number(expire) * 60 * 1000;
    const token =  jwt.sign(
                    { 
                        sessionId: sessionId,
                        // userId: user._id.toString(),
                        ...(user.email && {  email: user.email }),
                        ...(user.phone && {  phone: user.phone })
                    },
                        secret,
                    { expiresIn: expire_ms / 1000 }
                );

    const expireAt =  new Date( Date.now() + expire_ms );

    return { token, expireAt };
}

export function createRefreshToken({ expire }){

    const REFRESH_TOKEN_EXPIRE_MS = Number(expire) * 60 * 1000;
    const token = crypto.randomBytes(64).toString('hex');
    const expireAt = new Date( Date.now() + REFRESH_TOKEN_EXPIRE_MS );
    return { token, expireAt };
}

function calculateLockTime(failedAttempts) {
  const MAX_LOGIN_ATTEMPT =  Number(process.env.MAX_LOGIN_ATTEMPT )|| 5;
  if (failedAttempts < MAX_LOGIN_ATTEMPT) return null;
  
//   const lockMinutes = Math.pow(2, failedAttempts - MAX_LOGIN_ATTEMPT);
  return new Date(Date.now() + (Math.pow(2, failedAttempts - MAX_LOGIN_ATTEMPT) * 60 * 1000));
}