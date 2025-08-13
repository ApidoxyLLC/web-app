import mongoose from 'mongoose';
import { vendorModel } from '@/models/vendor/Vendor';
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';

export async function removeStaffFromVendor({ vendorId, email }) {
  try {
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return {
        success: false,
        message: 'Invalid vendorId or userId',
        code: 'INVALID_INPUT'
      };
    }

    const db = await vendorDbConnect();
    const Vendor = vendorModel(db);



    const result = await Vendor.updateOne(
      { _id: vendorId },
      { $pull: { staffs: { email: { $regex: new RegExp(`^${email}$`, 'i') } } }}
    )


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