export default function hasProductWritePermission(vendor, userId) {
  // Check if user is the vendor owner
  if (vendor.ownerId.toString() === userId.toString()) return true;
  
  // Check if user exists in stuffs with r:customer or w:customer permission
  return vendor.staffs?.some(staff =>  staff.userId?.toString() === userId.toString() 
                                    && Array.isArray(staff.permission)
                                    && (staff.permission.includes('w:shop') ||  staff.permission.includes('w:product'))
  );
}