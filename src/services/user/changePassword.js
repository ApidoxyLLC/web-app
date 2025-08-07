import bcrypt from 'bcryptjs';
import { userModel } from '@/models/auth/User';
import authDbConnect from '@/lib/mongodb/authDbConnect';

export default async function changePassword({ userId, currentPassword, newPassword }) {
  if (!userId || !currentPassword || !newPassword) {
    throw new Error("Missing required fields");
  }

  const db = await authDbConnect()
  const User = userModel(db);
  const user = await User.findById(userId).select('+security.password').session(session);

  if (!user) {
    throw new Error("User not found");
  }

  const isPasswordCorrect = await bcrypt.compare(currentPassword, user.security.password);
  if (!isPasswordCorrect) {
    throw new Error("Current password is incorrect");
  }

  const salt = await bcrypt.genSalt(14);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  user.security.password = hashedPassword;


  await user.save();

  return { success: true };
}