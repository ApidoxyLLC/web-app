import { couponModel } from '@/models/shop/product/Coupon';

export async function validateCouponStacking(vendor_db, couponCodes, userId) {
    const Coupon = couponModel(vendor_db);
    
    // Get all coupons being applied
    const coupons = await Coupon.find({ 
        code: { $in: couponCodes },
        isActive: true
    }).lean();

    // Check if any coupon doesn't allow stacking
    const nonStackableCoupons = coupons.filter(c => !c.allowStacking);
    
    if (nonStackableCoupons.length > 1) {
        return {
            valid: false,
            error: `Cannot stack these coupons: ${nonStackableCoupons.map(c => c.code).join(', ')}`
        };
    }

    // Check if stacking would exceed maximum discount rules
    const totalPotentialDiscount = coupons.reduce((sum, coupon) => {
        // This is simplified - actual calculation would depend on your business rules
        return sum + (coupon.maxDiscount || coupon.amount || 0);
    }, 0);

    // Example business rule: Max 30% total discount from coupons
    if (totalPotentialDiscount > 30 && coupons.some(c => c.type === 'percentage_off')) {
        return {
            valid: false,
            error: 'Total discount from coupons cannot exceed 30%'
        };
    }

    // Check if any coupons conflict in their targeting
    const productSpecificCoupons = coupons.filter(c => 
        c.target?.products || c.target?.categories
    );
    
    if (productSpecificCoupons.length > 1) {
        return {
            valid: false,
            error: 'Cannot stack multiple product-specific coupons'
        };
    }

    return { valid: true };
}

export default validateCouponStacking
// export const validateCouponStacking = async (vendor_db, couponCodes, userId) => {
//     const Coupon = couponModel(vendor_db);
    
//     // Get all coupons being applied
//     const coupons = await Coupon.find({ 
//         code: { $in: couponCodes },
//         isActive: true
//     }).lean();

//     // Check if any coupon doesn't allow stacking
//     const nonStackableCoupons = coupons.filter(c => !c.allowStacking);
    
//     if (nonStackableCoupons.length > 1) {
//         return {
//             valid: false,
//             error: `Cannot stack these coupons: ${nonStackableCoupons.map(c => c.code).join(', ')}`
//         };
//     }

//     // Check if stacking would exceed maximum discount rules
//     const totalPotentialDiscount = coupons.reduce((sum, coupon) => {
//         // This is simplified - actual calculation would depend on your business rules
//         return sum + (coupon.maxDiscount || coupon.amount || 0);
//     }, 0);

//     // Example business rule: Max 30% total discount from coupons
//     if (totalPotentialDiscount > 30 && coupons.some(c => c.type === 'percentage_off')) {
//         return {
//             valid: false,
//             error: 'Total discount from coupons cannot exceed 30%'
//         };
//     }

//     // Check if any coupons conflict in their targeting
//     const productSpecificCoupons = coupons.filter(c => 
//         c.target?.products || c.target?.categories
//     );
    
//     if (productSpecificCoupons.length > 1) {
//         return {
//             valid: false,
//             error: 'Cannot stack multiple product-specific coupons'
//         };
//     }

//     return { valid: true };
// };