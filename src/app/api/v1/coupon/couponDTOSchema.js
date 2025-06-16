
import { z } from "zod";
import { ObjectId } from "mongodb";

// Helper schemas
const historySchema = z.object({
  customerId: z.instanceof(ObjectId).optional(),
  orderId: z.instanceof(ObjectId).optional(),
  usedAt: z.date().optional().default(new Date()),
  discountAmount: z.number().min(0),
  location: z.object({
    ip: z.string(),
    country: z.string(),
    device: z.string()
  }).optional()
});

const couponUsageSchema = z.object({
  limit: z.number().min(1).optional(),
  perCustomerLimit: z.number().min(1).default(1),
  count: z.number().min(0).default(0),
  applyCount: z.number().min(0).default(0),
  dailyLimit: z.number().min(1).optional(),
  expireAfter: z.number().min(1).optional(),
  history: z.array(historySchema).default([])
}).strict();

const geographicRestrictionsSchema = z.object({
  countries: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  postalCodes: z.array(z.string()).optional()
}).strict();

const excludeSchema = z.object({
  products: z.array(z.instanceof(ObjectId)).optional(),
  categories: z.array(z.instanceof(ObjectId)).optional(),
  customers: z.array(z.instanceof(ObjectId)).optional(),
  paymentMethods: z.array(z.enum(['cod', 'bkash', 'bank_transfer'])).optional()
}).strict();

const targetSchema = z.object({
  products: z.array(z.instanceof(ObjectId)).optional(),
  categories: z.array(z.instanceof(ObjectId)).optional(),
  userGroups: z.enum(['all', 'new', 'vip', 'referral', 'first_time']).optional()
}).strict();

const auditTrailSchema = z.object({
  action: z.enum(['created', 'edited', 'disabled']),
  actorId: z.instanceof(ObjectId),
  timestamp: z.date().default(new Date())
}).strict();

const bogoRulesSchema = z.object({
  buyQuantity: z.number().min(1),
  getQuantity: z.number().min(1),
  productIds: z.array(z.instanceof(ObjectId))
}).strict();

// Main coupon schema
export const couponDTOSchema = z.object({
  vendorId: z.string().min(1, "Vendor ID is required"),
  title: z.string().trim().min(1),
  code: z.string().trim().min(1),
  type: z.enum([
    'percentage_off', 
    'fixed_amount', 
    'free_shipping', 
    'bogo', 
    'free_gift', 
    'tiered', 
    'flash_sale', 
    'first_purchase', 
    'next_purchase', 
    'cashback', 
    'preorder_discount', 
    'bundle'
  ]),
  target: targetSchema.optional(),
  exclude: excludeSchema.optional(),
  geographicRestrictions: geographicRestrictionsSchema.optional(),
  amount: z.number().min(0).optional()
    .refine((val, ctx) => {
      const type = ctx.parent.type;
      if (!['free_shipping', 'bogo', 'free_gift'].includes(type) && val === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Amount is required for this coupon type"
        });
        return false;
      }
      return true;
    }),
  minValue: z.number().min(0).optional(),
  maxDiscount: z.number().min(0).optional(),
  priority: z.number().default(1),
  startDate: z.date().default(new Date()),
  endDate: z.date(),
  bogoRules: bogoRulesSchema.optional()
    .refine((val, ctx) => {
      if (ctx.parent.type === 'bogo' && !val) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "BOGO rules are required for BOGO coupons"
        });
        return false;
      }
      return true;
    }),
  allowStacking: z.boolean().default(false),
  customerEligibility: z.enum(['all', 'new_customers', 'existing_customers', 'specific_customers']).default('all'),
  customers: z.array(z.instanceof(ObjectId)).optional()
    .refine((val, ctx) => {
      if (ctx.parent.customerEligibility === 'specific_customers' && (!val || val.length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Customers must be specified for specific_customers eligibility"
        });
        return false;
      }
      return true;
    }),
  createdBy: z.instanceof(ObjectId),
  usage: couponUsageSchema.optional(),
  isActive: z.boolean().default(true),
  autoApply: z.boolean().default(false),
  isPublic: z.boolean().default(false),
  redeemMethod: z.enum(['link', 'automatic', 'code']).default('code'),
  platforms: z.array(z.enum(['web', 'mobile', 'app'])).default([]),
//   storeScope: z.instanceof(ObjectId).optional(),
  auditTrail: z.array(auditTrailSchema).default([]),
  currency: z.enum(['USD', 'EUR', 'GBP', 'JPY', 'INR', 'BDT']).default('BDT'),
  metadata: z.object({
    template: z.string().optional(),
    note: z.string().optional(),
    icon: z.string().optional(),
    affiliateId: z.string().optional(),
    utmSource: z.string().optional(),
    customRules: z.any().optional()
  }).optional()
}).strict();

export default couponDTOSchema