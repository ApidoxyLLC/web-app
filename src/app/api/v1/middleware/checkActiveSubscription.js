export async function checkActiveSubscription(shopReferenceId, newPlanSlug = null) {
    const vendor_db = await vendorDbConnect();
    const Invoice = InvoiceModel(vendor_db);
    const SubscriptionPlan = PlanModel(vendor_db);

    const activeSub = await Invoice.findOne({
        shopReferenceId,
        status: 'paid',
        'validity.until': { $gte: new Date() }
    }).sort({ 'validity.until': -1 });

    if (!activeSub) return { isActive: false };

    if (newPlanSlug) {
        const currentPlan = await SubscriptionPlan.findById(activeSub.planId);
        const newPlan = await SubscriptionPlan.findOne({ slug: newPlanSlug });

        return {
            isActive: true,
            isUpgrade: newPlan.price > currentPlan.price,
            isDowngrade: newPlan.price < currentPlan.price,
            currentPlan: currentPlan.name,
            proposedPlan: newPlan.name,
            activeUntil: activeSub.validity.until
        };
    }

    return {
        isActive: true,
        subscription: activeSub
    };
}