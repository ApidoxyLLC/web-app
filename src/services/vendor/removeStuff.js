import mongoose from 'mongoose';
import { vendorModel } from '@/models/vendor/Vendor';
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';

export async function removeStaffFromVendor({ vendorId, userId }) {
  if (!mongoose.Types.ObjectId.isValid(vendorId) || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid vendorId or userId');
  }

  const db = await vendorDbConnect()
  const Vendor = vendorModel(db)
  const result = await Vendor.updateOne(
    { _id: vendorId },
    {
      $pull: {
        staffs: { userId: userId },
      },
    }
  );

  if (result.modifiedCount === 0) {
    return { success: false, message: 'Staff not found or already removed' };
  }

  return { success: true, message: 'Staff removed successfully' };
}

export default removeStaffFromVendor