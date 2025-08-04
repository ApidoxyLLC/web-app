

export async function addStaff({ vendorId, staff }) {

  const update = {
    $push: {
      staffs: {
        userId: staff.userId,
        designation: staff.designation,
        status: staff.status, 
        permission: staff.permission || [],
        startDate: new Date(),
        endDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }
  };

  const updatedVendor = await vendorModel.findByIdAndUpdate(
    vendorId,
    update,
    { new: true }
  );

  if (!updatedVendor) {
    throw new Error('Vendor not found');
  }

  return updatedVendor;
}