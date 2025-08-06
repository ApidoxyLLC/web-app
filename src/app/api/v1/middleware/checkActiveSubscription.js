// middleware/checkActiveSubscription.js
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';
import { vendorModel } from '@/models/vendor/Vendor';

export async function checkActiveSubscription(shopReferenceId) {
    const vendor_db = await vendorDbConnect();
    const Vendor = vendorModel(vendor_db);

    const vendor = await Vendor.findOne(
        { referenceId: shopReferenceId },
        { 'subscriptionScope': 1 }
    ).lean();


    console.log(vendor);

    const isPaidPlan = ['plan-b', 'plan-c'].includes(vendor?.subscriptionScope?.slug);
    console.log(isPaidPlan)
    const currentDate = new Date();
    const validUntil = new Date(vendor?.subscriptionScope?.validity?.until);

    const hasActivePaidSubscription = isPaidPlan &&
        vendor?.subscriptionScope?.isActive &&
        validUntil > currentDate;
   
    console.log(hasActivePaidSubscription)

    return {
        isActive: hasActivePaidSubscription,
        isFreePlan: vendor?.subscriptionScope?.slug === 'plan-a',
        subscription: vendor?.subscriptionScope || null,
        validUntil: hasActivePaidSubscription ? validUntil : null
    };
}