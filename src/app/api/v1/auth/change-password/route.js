import { NextResponse } from 'next/server';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import changePassword from '@/services/user/changePassword';
// import changePassword from '@/services/auth/changePassword';

import getAuthenticatedUser from '../utils/getAuthenticatedUser';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import { z } from 'zod';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, "Current password required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export async function PATCH(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || request.socket?.remoteAddress || "unknown";

  const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: "change-password" });
  if (!allowed)
    return NextResponse.json({ error: `Too many requests. Retry after ${retryAfter}s.` }, { status: 429 });

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const { currentPassword, newPassword } = parsed.data;

  const { authenticated, data: authUser, error } = await getAuthenticatedUser(request);
  if (!authenticated)
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  try {

    await changePassword({          userId: authUser.userId,
                           currentPassword,
                               newPassword                      });

    return NextResponse.json({ message: "Password changed successfully" }, { status: 200 });
  } catch (err) {
    await session.abortTransaction();
    return NextResponse.json({ error: err.message || "Failed to change password" }, { status: 400 });
  } finally {
    session.endSession();
  }
}