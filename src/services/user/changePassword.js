import bcrypt from 'bcryptjs';
import { userModel } from '@/models/auth/User';
import authDbConnect from '@/lib/mongodb/authDbConnect';

export default async function changePassword({ userId, currentPassword, newPassword }) {
  if (!userId || !currentPassword || !newPassword)  throw new Error("Missing required fields");
  
  const db = await authDbConnect()
  const User = userModel(db);
  const user = await User.findById(userId).select('security.password');  

  console.log(user)
  if (!user) throw new Error("User not found"); 

  const isPasswordCorrect = await bcrypt.compare(currentPassword, user.security.password);
  if (!isPasswordCorrect) throw new Error("Current password is incorrect");
  
  const isSamePassword = await bcrypt.compare(newPassword, user.security.password);
  if (isSamePassword) throw new Error("New password must be different from current password");

  const salt = await bcrypt.genSalt(14);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  await User.findByIdAndUpdate( userId, { $set: { 'security.password': hashedPassword,
                                                  'security.passwordChangedAt': new Date() }
                                        },
                                { new: false } 
                              );
  return { success: true };
}