
export async function calculateDiscount({ coupon, products, productIds, user, cartAmount, productMap, applicableProductIds, inapplicableProducts, findFreeGiftProduct }) {
  let discountAmount = 0;
  let discountDetails = {};

  try {
    switch (coupon.type) {
      case 'fixed_amount':
        discountAmount = coupon.amount;
        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount)
          discountAmount = coupon.maxDiscount;

        discountDetails = {     type: 'fixed',
                              amount: discountAmount,
                            currency: coupon.currency,
                        };
        break;

      case 'percentage_off':
        discountAmount = (cartAmount * coupon.amount) / 100;
        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount)
          discountAmount = coupon.maxDiscount;

        discountDetails = {
          type: 'percentage',
          percentage: coupon.amount,
          amount: discountAmount,
          currency: coupon.currency,
          maxDiscount: coupon.maxDiscount,
        };
        break;

      case 'bogo': {
        if (!coupon.bogoRules)
          return { success: false, error: 'BOGO rules missing' };

        const bogoIds = coupon.bogoRules.productIds.map((id) => id.toString());

        const eligibleProducts = applicableProductIds.filter(
          (id) => bogoIds.includes(id) && !inapplicableProducts.has(id)
        );

        if (eligibleProducts.length < coupon.bogoRules.buyQuantity) {
          return {
            success: false,
            error: `Need to purchase ${coupon.bogoRules.buyQuantity} of eligible products for BOGO`,
          };
        }

        const eligiblePairs = Math.floor(
          eligibleProducts.length / coupon.bogoRules.buyQuantity
        );
        const productsToDiscount =
          eligiblePairs * coupon.bogoRules.getQuantity;

        discountAmount = eligibleProducts
          .slice(0, productsToDiscount)
          .reduce((sum, productId) => sum + (productMap[productId]?.price?.base || 0), 0);

        discountDetails = {
          type: 'bogo',
          buyQuantity: coupon.bogoRules.buyQuantity,
          getQuantity: coupon.bogoRules.getQuantity,
          eligiblePairs,
          discountAmount,
          discountedProducts: eligibleProducts.slice(0, productsToDiscount).map((id) => ({
            productId: productMap[id]?.productId,
            name: productMap[id]?.name,
            price: productMap[id]?.price?.base,
          })),
        };
        break;
      }

      case 'free_shipping':
        discountDetails = {
          type: 'free_shipping',
          description: 'Free shipping applied',
        };
        break;

      case 'free_gift': {
        const giftId = coupon.metadata?.freeGiftProductId;
        if (!giftId) return { success: false, error: 'Free gift product not specified' };

        const giftProduct = await findFreeGiftProduct(giftId);
        if (!giftProduct)
          return { success: false, error: 'Free gift product not available' };

        discountDetails = {
          type: 'free_gift',
          productId: giftProduct.productId,
          productName: giftProduct.name,
          image: giftProduct.images?.[0],
          value: giftProduct.price.base,
        };
        break;
      }

      case 'tiered': {
        const tiers = coupon.metadata?.tieredRules;
        if (!tiers) return { success: false, error: 'Tiered rules not specified' };

        const sortedTiers = [...tiers].sort((a, b) => b.threshold - a.threshold);
        const applicableTier = sortedTiers.find((tier) => cartAmount >= tier.threshold);

        if (!applicableTier)
          return {
            success: false,
            error: `Cart amount doesn't qualify for any discount tier (min: ${sortedTiers.at(-1)?.threshold})`,
          };

        discountAmount =
          applicableTier.type === 'percentage'
            ? (cartAmount * applicableTier.value) / 100
            : applicableTier.value;

        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount)
          discountAmount = coupon.maxDiscount;

        discountDetails = {
          type: 'tiered',
          tier: applicableTier.name || `Tier ${sortedTiers.indexOf(applicableTier) + 1}`,
          discountType: applicableTier.type,
          discountValue: applicableTier.value,
          discountAmount,
          nextTier: sortedTiers[sortedTiers.indexOf(applicableTier) - 1] || null,
          currency: coupon.currency,
        };
        break;
      }

      case 'bundle': {
        const bundle = coupon.metadata?.bundleProducts;
        if (!bundle || bundle.length < 2)
          return { success: false, error: 'Bundle products not properly specified' };

        const bundleProductIds = bundle.map((p) => p.productId);
        const missing = bundleProductIds.filter((id) => !productIds.includes(id));

        if (missing.length > 0)
          return {
            success: false,
            error: `Missing required products for bundle: ${missing.join(', ')}`,
          };

        const bundleItems = products.filter((p) => bundleProductIds.includes(p.productId));
        const bundlePrice = bundleItems.reduce((sum, p) => sum + p.price.base, 0);

        if (coupon.metadata.bundleType === 'fixed_price') {
          discountAmount = bundlePrice - coupon.metadata.bundlePrice;
        } else if (coupon.metadata.bundleType === 'percentage') {
          discountAmount = (bundlePrice * coupon.amount) / 100;
        } else {
          discountAmount = coupon.amount;
        }

        discountDetails = {
          type: 'bundle',
          bundleType: coupon.metadata.bundleType,
          bundleName: coupon.metadata.bundleName || '',
          discountAmount,
          requiredProducts: bundleProductIds,
          bundlePrice: coupon.metadata.bundlePrice || null,
          currency: coupon.currency,
        };
        break;
      }

      case 'cashback':
        if (!coupon.metadata?.cashbackMethod)
          return { success: false, error: 'Cashback method not specified' };

        discountAmount =
          coupon.metadata.cashbackType === 'percentage'
            ? (cartAmount * coupon.amount) / 100
            : coupon.amount;

        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount)
          discountAmount = coupon.maxDiscount;

        discountDetails = {
          type: 'cashback',
          cashbackType: coupon.metadata.cashbackType,
          cashbackAmount: discountAmount,
          cashbackMethod: coupon.metadata.cashbackMethod,
          currency: coupon.currency,
          minValue: coupon.minValue,
          terms: coupon.metadata.cashbackTerms || '',
        };
        break;

      default:
        return { success: false, error: 'Unsupported coupon type' };
    }

    return { success: true, discountAmount, discountDetails };
  } catch (err) {
    return { success: false, error: 'Unexpected error during discount calculation' };
  }
}

export default calculateDiscount;