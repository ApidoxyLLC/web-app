import mongoose from "mongoose";
import cuid from "@bugsnag/cuid";


const historySchema = new mongoose.Schema({
      customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
         orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
          usedAt: { type: Date, default: Date.now },
  discountAmount: Number
}, { _id: false });

const couponUsageSchema = new mongoose.Schema({
             limit: { type: Number, min: [1, 'Usage limit must be at least 1'] },
  perCustomerLimit: { type: Number, min: [1, 'Per customer limit must be at least 1'], default: 1 },
             count: { type: Number, default: 0, min: [0, 'Used count cannot be negative'] },
           history: { type: [historySchema], default: [] }
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

export const couponSchema = new mongoose.Schema({
                couponId: { type: String, default: () => cuid() },
                    code: { type: String, required: true, unique: true, trim: true },
            discountType: { type: String, enum: ['percentage', 'fixed', 'free_shipping'], required: true },
                  amount: { type: Number, min: [0, 'Discount value cannot be negative'], required: function () { return this.discountType !== 'free_shipping' } },
               appliesTo: { type: String, enum: ['entire_order', 'specific_products', 'specific_category', 'specific_payment_method'], default: 'entire_order' },
                products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: function () { return this.appliesTo === 'specific_products' }}],
              categories: [{type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: function () { return this.appliesTo === 'specific_category' }}],
          paymentMethods: [{ type: String, enum: ['cod', 'bkash', 'bank_transfer'], required: function () {return this.appliesTo === 'specific_payment_method';}}],
     customerEligibility: { type: String, enum: ['all', 'new_customers', 'existing_customers', 'specific_customers'], default: 'all' },
               customers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: function () {return this.customerEligibility === 'specific_customers' } }],
                 exclude: { type: excludeSchema, default: undefined },
  geographicRestrictions: { type: geographicRestrictionsSchema, default: undefined },
                currency: { type: String, enum: ['USD', 'EUR', 'GBP', 'JPY', 'INR', 'BDT'], default: 'BDT' },
                minValue: { type: Number, min: [0, 'Minimum cart value cannot be negative'] },
               maxAmount: { type: Number, min: [0, 'Max discount cannot be negative'] },
               startDate: { type: Date, default: Date.now },
           allowStacking: {type: Boolean, default: false },
                validity: { type: Date, required: true },
               createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopOwner', required: true },
                   usage: { type: couponUsageSchema },
                isActive: { type: Boolean, default: true },
  metadata: {
    affiliateId: String,
    utmSource: String,
    customRules: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  collection: 'coupon'
});

export const couponModel = (db) => db.models.Coupon || db.model('Coupon', couponSchema);

