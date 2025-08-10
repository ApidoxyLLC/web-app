import mongoose from 'mongoose';
import { vendorModel } from '@/models/vendor/Vendor';
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';

export async function removeStaffFromVendor({ vendorId, userId, email }) {
  try {
    if (!mongoose.Types.ObjectId.isValid(vendorId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return {
        success: false,
        message: 'Invalid vendorId or userId',
        code: 'INVALID_INPUT'
      };
    }

    const db = await vendorDbConnect();
    const Vendor = vendorModel(db);

    const pullCondition = email
      ? { userId: userId, email: email } 
      : { userId: userId }; 

    const result = await Vendor.updateOne(
      { _id: vendorId },
      { $pull: { staffs: pullCondition } }
    );

    if (result.modifiedCount === 0) {
      return {
        success: false,
        message: 'Staff not found or already removed',
        code: 'NOT_FOUND'
      };
    }

    return {
      success: true,
      message: 'Staff removed successfully',
      removedUserId: userId,
      removedEmail: email
    };

  } catch (error) {
    console.error('Error removing staff from vendor:', error);
    return {
      success: false,
      message: error.message || 'Failed to remove staff',
      code: 'INTERNAL_ERROR'
    };
  }
}

export default removeStaffFromVendor;