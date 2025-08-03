

export default function hasCustomerReadAccess(vendor, userId) {
  // Check if user is the vendor owner
  if (vendor.ownerId.toString() === userId.toString()) {
    return true;
  }

  // Check if user exists in stuffs with r:customer or w:customer permission
  return vendor.stuffs?.some(staff => 
    staff.userId?.toString() === userId.toString() &&
    Array.isArray(staff.permission) &&
    (staff.permission.includes('r:customer') || staff.permission.includes('w:customer'))
  );
}