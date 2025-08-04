import mongoose from "mongoose";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import { vendorModel } from "@/models/vendor/Vendor";

export async function upsertStaffToVendor({ vendorId, staff }){
  if (!mongoose.Types.ObjectId.isValid(vendorId) || !mongoose.Types.ObjectId.isValid(staff.userId))
    throw new Error('Invalid vendorId or userId');
  const db = await vendorDbConnect();
  const Vendor = vendorModel(db)


  // Step 1: Try to update existing staff
  const result = await Vendor.updateOne(
    {
      _id: vendorId,
      'staffs.userId': staff.userId,
    },
    {
      $set: {
        'staffs.$.designation': staff.designation,
        'staffs.$.status': staff.status || 'active',
        'staffs.$.permission': staff.permission || [],
        'staffs.$.startDate': staff.startDate || new Date(),
        'staffs.$.endDate': staff.endDate || null,
        'staffs.$.updatedAt': new Date(),
      },
    }
  );

  // Step 2: If no existing staff was updated, push new one
  if (result.modifiedCount === 0) {
    await Vendor.updateOne(
      { _id: vendorId },
      {
        $push: {
          staffs: {
            userId: staff.userId,
            designation: staff.designation,
            status: staff.status || 'active',
            permission: staff.permission || [],
            startDate: staff.startDate || new Date(),
            endDate: staff.endDate || null,
            notes: staff.notes || [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      }
    );
  }

  return { success: true };
}

export default upsertStaffToVendor