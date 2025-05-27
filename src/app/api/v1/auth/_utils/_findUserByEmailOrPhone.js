import mongoose from 'mongoose';

export async function findUserByEmailOrPhone({ email, phone }) {
  // Connect to MongoDB if not already connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI_AUTH);
  }

  const filter = {
    $or: [
      email ? { email } : null,
      phone ? { phone } : null
    ].filter(Boolean)  // Remove nulls if only one is provided
  };

  const user = await mongoose.connection
    .collection('users')
    .findOne(filter);

  return user;
}