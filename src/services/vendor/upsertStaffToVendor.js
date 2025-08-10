import mongoose from "mongoose";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import { vendorModel } from "@/models/vendor/Vendor";

export async function upsertStaffToVendor({ vendorId, staff }) {
  if (!mongoose.Types.ObjectId.isValid(vendorId) || !mongoose.Types.ObjectId.isValid(staff.userId))
    throw new Error('Invalid vendorId or userId');
  const db = await vendorDbConnect();
  const Vendor = vendorModel(db);

  const updateFields = {
    'staffs.$.designation': staff.designation,
    'staffs.$.status': staff.status || 'active',
    'staffs.$.permission': staff.permission || [],
    'staffs.$.startDate': staff.startDate || new Date(),
    'staffs.$.endDate': staff.endDate || null,
    'staffs.$.updatedAt': new Date(),
  };

  if (staff.email) {
    updateFields['staffs.$.email'] = staff.email;
  }

  const result = await Vendor.updateOne(
    {
      _id: vendorId,
      'staffs.userId': staff.userId,
    },
    { $set: updateFields }
  );

  if (result.modifiedCount === 0) {
    const newStaff = {
      userId: staff.userId,
      email: staff.email, 
      designation: staff.designation,
      status: staff.status || 'active',
      permission: staff.permission || [],
      startDate: staff.startDate || new Date(),
      endDate: staff.endDate || null,
      notes: staff.notes || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await Vendor.updateOne(
      { _id: vendorId },
      { $push: { staffs: newStaff } }
    );
  }

  return { success: true };
}

export default upsertStaffToVendor;