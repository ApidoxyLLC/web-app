import mongoose from "mongoose";
import cuid from "@bugsnag/cuid";

// const historySchema = new mongoose.Schema({
//       customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//          orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
//           usedAt: { type: Date, default: Date.now },
//   discountAmount: Number,
//         location: {      ip: String,
//                     country: String,
//                      device: String   }
// }, { _id: false });

const couponUsageSchema = new mongoose.Schema({
             limit: { type: Number, min: 1 },
  perCustomerLimit: { type: Number, min: 1, default: 1 },
             count: { type: Number, default: 0, min: 0 },
        applyCount: { type: Number, default: 0 },
        dailyLimit: { type: Number, min: 1 },
       expireAfter: { type: Number, min: 1 },
}, { _id: false });

const geographicRestrictionsSchema = new mongoose.Schema({  
        countries: [String],
          regions: [String],
      postalCodes: [String]
    }, { _id: false });

const excludeSchema = new mongoose.Schema({
        products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
      categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
       customers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  paymentMethods: [{ type: String, enum: ['cod', 'bkash', 'bank_transfer'] }]
}, { _id: false });

const targetSchema = new mongoose.Schema({
        products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
      categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
      userGroups: {  type: String, enum: ['all', 'new', 'vip', 'referral', 'first_time'] },
  paymentMethods: [{ type: String, enum: ['cod', 'rocket', 'nagad', 'bkash', 'bank_transfer'] }]
}, { _id: false });

const auditTrailSchema = new mongoose.Schema({
          action: { type: String, enum: ['created', 'edited', 'disabled'] },
         actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
       timestamp: { type: Date, default: Date.now }
}, { _id: false });

const bogoRulesSchema = new mongoose.Schema({
     buyQuantity: Number,
     getQuantity: Number,
      productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
}, { _id: false });

export const couponSchema = new mongoose.Schema({
                couponId: { type: String, default: () => cuid() },
                   title: { type: String, required: true, trim: true },
                    code: { type: String, required: true, unique: true, trim: true },
                    type: { type: String, enum: ['percentage_off', 'fixed_amount', 'free_shipping', 'bogo', 'free_gift', 'tiered', 'flash_sale', 'first_purchase', 'next_purchase', 'cashback', 'preorder_discount', 'bundle' ], required: true },
                  target: { type: targetSchema, default: undefined },
                 exclude: { type: excludeSchema, default: undefined },
  geographicRestrictions: { type: geographicRestrictionsSchema, default: undefined },
                  amount: { type: Number, min: 0, required: function() { return !['free_shipping', 'bogo', 'free_gift'].includes(this.type) }},
                minValue: { type: Number, min: 0 },
             maxDiscount: { type: Number, min: 0 },
                priority: { type: Number, default: 1 },
               startDate: { type: Date, default: Date.now },
                 endDate: { type: Date, required: true },
               bogoRules: { type: bogoRulesSchema, required: function () { return this.type === 'bogo' }, default: undefined },
           allowStacking: { type: Boolean, default: false },
     customerEligibility: { type: String, enum: ['all', 'new_customers', 'existing_customers', 'specific_customers'], default: 'all' },
               customers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: function () { return this.customerEligibility === 'specific_customers'; } }],
               createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopOwner', required: true },
                   usage: { type: couponUsageSchema },
                isActive: { type: Boolean, default: true },
              //  autoApply: { type: Boolean, default: false },
                isPublic: { type: Boolean, default: true },
            redeemMethod: { type: String, enum: ['link', 'automatic', 'code'], default: 'code' },
               platforms: { type: [String], enum: ['web', 'mobile', 'app'], default: [] },
              // storeScope: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
              auditTrail: { type: [auditTrailSchema], default: [] },
                currency: { type: String, enum: ['USD', 'EUR', 'GBP', 'JPY', 'INR', 'BDT'], default: 'BDT' },
                metadata: { template: String,
                                note: String,
                                icon: String,
                         affiliateId: String,
                           utmSource: String,
                         customRules: mongoose.Schema.Types.Mixed,
                   freeGiftProductId: String,
                         tieredRules: [{       name: String,
                                          threshold: Number,
                                               type: { type: String, enum: ['percentage', 'fixed'] },
                                              value: Number
                                        }],
                              
                    // For bundle type
                      bundleProducts: [{ productId: String,
                                          required: { type: Boolean, default: true }  }],
                          bundleType: { type: String, enum: ['percentage', 'fixed_amount', 'fixed_price'] },
                         bundlePrice: Number,
                          bundleName: String,
                              
                    // For cashback type
                        cashbackType: { type: String, enum: ['percentage', 'fixed'] },
                      cashbackMethod: String, // e.g., 'wallet', 'credit', 'voucher'
                       cashbackTerms: String,
                              
                    // For next_purchase type
                      issuedForOrder: String,
                   issuedForCustomer: String,
                          expiryDays: Number 
                        }
}, {
  timestamps: true,
  collection: 'coupons'
});
export const couponModel = (db) => db.models.Coupon || db.model('Coupon', couponSchema);
