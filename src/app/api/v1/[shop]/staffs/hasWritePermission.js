export function hasDeletePermission(vendor, userId) {
    if (vendor.ownerId.toString() === userId.toString()) {
        return true;
    }

    return vendor.staffs?.some(staff =>
        staff.userId?.toString() === userId.toString() &&
        staff.status === 'active' &&
        Array.isArray(staff.permission) &&
        staff.permission.includes('d:shop')
    );
}

