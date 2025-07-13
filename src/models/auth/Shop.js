import mongoose from 'mongoose';
import cuid from '@bugsnag/cuid';

// const dbInfoSchema = new mongoose.Schema({
//     storageType: { type: [String], enum: ['individual-cluster', 'individual-database', 'shared-cluster', 'shared-database', 'self-hosted', 'other'], default: null },
//     clusterName: { type: String, default: null },
//     databaseName: { type: String, default: null },
//     connectionString: { type: String, default: null },
//     host: { type: String, default: null },
//     port: { type: Number, default: null },
//     provider: { type: String, enum: ['aws', 'gcp', 'azure', 'atlas', 'self-hosted', 'other'], default: null },
//     region: { type: String, default: null},
//     auth: {   username: { type: String, default: null },
//               password: { type: String, default: null },
//              mechanism: { type: String, default: null } },
//     sslEnabled: { type: Boolean, default: null },
//     replicaSet: { type: String, default: null },
//     backupPolicy: { enabled: { type: Boolean, default: null },
//                   frequency: { type: String, default: null },
//               retentionDays: { type: Number, default: null},
//                   },
//     version: { type: String, default: null },
//     tags: { type:[String], default: null }, 
// }, { timestamps: false });


const socialLinksSchema = new mongoose.Schema({
    platform: { type: String, enum: ['facebook', 'twitter', 'telegram', 'discord', 'whatsapp', 'instagram', 'linkedin', 'youtube', 'tiktok']  },
    link: { type: String },
}, { _id: false });

const appSettingsSchema = new mongoose.Schema({
  templates: { type: String, enum: ['desiree', 'stylo'], default: 'desiree' },
  color: { type: String, required: true },
  notifications: { type: Boolean, default: true },
}, { _id: false });

const extraPolicySchema = new mongoose.Schema({
         type: { type: String },
        title: { type: String },
  description: { type: String },
          url: { type: String },
       status: { type: String, enum: ['active', 'inactive', 'draft'], default: 'inactive' },
    deletedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
deletedReason: { type: String, default: null },
}, { timestamps: true, _id: false });

const baseAppSchema = new mongoose.Schema({
        appId: { type: String, required: true, index: true },
      appSlug: { type: String, default: null},
      appName: { type: String, required: true },
      appIcon: { type: String, required: true },
        email: { type: String, required: false, default: null },
        phone: { type: String, required: false, default: null },
      version: { type: String, default: null },
       status: { type: String, default: 'pending', enum: ['active', 'inactive', 'pending', 'on-build', 'prepared'] },
     language: { type: String, enum: ['en_US', 'bn_BD' ], default: 'en_US' },
       appUrl: { type: String, required: false, default: null },  
    contactUs: { type: String, default: null },
     settings: appSettingsSchema,
  socialLinks: [socialLinksSchema],
extraPolicies: [extraPolicySchema], 
  siteMap: { type: String, default: null },
  

  // recommend to remove
  // aboutUs: { type: String, default: null },
  // termsAndConditions: { type: String, default: null },
  // privacyPolicy: { type: String, default: null },
  // refundPolicy: { type: String, default: null },
  
// Delivery include here 

// Payment Settings apply here
}, { timestamps: true });


const buildInfoSchema = new mongoose.Schema({ 
  buildNo:{ type:Number, default:0 },
  versionName: { type: String },
  buildTime: { type: String },
  buildDuration: { type: String },
  gitBranch: { type: String },
  buildStatus:{ type:String, enum:['success', 'pending', 'queued', 'failed']}
});

const androidAppSchema = new mongoose.Schema({ 
  ...baseAppSchema.obj,
  packageName: { type: String, required: true },
  buildInfo: [buildInfoSchema],
  firebaseJSONData: String,
  buildHistory: [{ 
                  si_no: { type: String, required: true }, 
                  version: { type: String, default: "" } 
                }]
});

const webAppSchema = new mongoose.Schema({
  ...baseAppSchema.obj,
  domain: { type: String, required: true }
}); 

const iosAppSchema = new mongoose.Schema({
  ...baseAppSchema.obj,
  firebaseJSONData: String,
  bundleId: { type: String, required: true },  
});

const dbSchema = new mongoose.Schema({
    provider: { type: String, default: 'mongodb' },
         uri: { type: String, default: '' },
      prefix: { type: String, default: 'shop_' }
}, { timestamps: false });

// const keySchema = new mongoose.Schema({
//            ACCESS_TOKEN_SECRET: { type: String, required: true },
//           REFRESH_TOKEN_SECRET: { type: String, required: true }, 
//                NEXTAUTH_SECRET: { type: String, required: true },
//     //  EMAIL_VERIFICATION_SECRET: { type: String, required: true },
//   //  ACCESS_TOKEN_EXPIRE_MINUTES: { type: Number, required: true, default: Number(process.env.END_USER_ACCESS_TOKEN_DEFAULT_EXPIRE_MINUTES || 15 ) }, 
//   // REFRESH_TOKEN_EXPIRE_MINUTES: { type: Number, required: true, default: Number(process.env.END_USER_REFRESH_TOKEN_DEFAULT_EXPIRE_MINUTES || 10080) }, 

//   // ACCESS_TOKEN_ENCRYPTION_KEY: { type: String, required: true },
//   // REFRESH_TOKEN_ENCRYPTION_KEY: { type: String, required: true },
   
// }, { timestamps: false, _id: false })

// const timeLimitationsSchema = new mongoose.Schema({
//      EMAIL_VERIFICATION_EXPIRE_MINUTES: { type: Number, required: true, default: Number(process.env.END_USER_EMAIL_VERIFICATION_EXPIRY || 10 ) }, 
//      PHONE_VERIFICATION_EXPIRE_MINUTES: { type: Number, required: true, default: Number(process.env.END_USER_PHONE_VERIFICATION_EXPIRY || 3 ) }, 
//            ACCESS_TOKEN_EXPIRE_MINUTES: { type: Number, required: true, default: Number(process.env.END_USER_ACCESS_TOKEN_DEFAULT_EXPIRE_MINUTES || 15 ) }, 
//           REFRESH_TOKEN_EXPIRE_MINUTES: { type: Number, required: true, default: Number(process.env.END_USER_REFRESH_TOKEN_DEFAULT_EXPIRE_MINUTES || 10080) }, 

//   // ACCESS_TOKEN_ENCRYPTION_KEY: { type: String, required: true },
//   // REFRESH_TOKEN_ENCRYPTION_KEY: { type: String, required: true },
 
// }, { timestamps: false, _id: false })

// const hostSchema = new mongoose.Schema({
//              domain: {   type: String, required: true, trim: true,
//                        unique: true, match: /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ },
//            hostType: {   type: [String], enum:['web', 'android', 'ios'], default: [] }, 
//          subdomains: {   type: [String],  default: [] },
// }, { timestamps: true });

const transactionFieldsSchema = new mongoose.Schema({
                txId: {  type: String, index: true, required: function() { return this.sagaStatus !== 'success' }},
          sagaStatus: { type: String, enum: ['pending', 'success', 'aborted', 'compensating', 'failed'], default: 'pending', index: true },
        lastTxUpdate: { type: Date },
}, { _id: false, timestamps: false });

const stuffSchema = new mongoose.Schema(
  {      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    designation: { type: String, enum: [ 'store_manager', 'assistant_manager', 'cashier', 'sales_associate', 'inventory_clerk', 'security', 'janitor', 'other' ], required: true },
         status: { type: String, enum: ['active', 'terminated', 'on_leave', 'resigned'], default: 'active' },
     permission: { type: [String], enum: ['r:shop', 'w:shop', 'r:product', 'c:product', 'w:shop', 'r:category', 'c:category', 'w:category']},
      startDate: { type: Date, required: true,},
        endDate: { type: Date },
          notes: [{    date: { type: Date, default: Date.now },
                     author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                    content: String }],
  },
  { timestamps: true }
);

const shopSchema = new mongoose.Schema({
                _id: { type: mongoose.Schema.Types.ObjectId, required: true },
        referenceId: { type: String, select: true },
          //  vendorId: { type: mongoose.Schema.Types.ObjectId, required: true  },
            ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  // ownerLoginSession: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Session' },
              email: { type: String, trim: true },
              phone: { type: String, trim: true },
            country: { type: String, required: true },
           industry: { type: String, required: true },
       businessName: { type: String, required: true },
           location: { type: String, required: true },

        //  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  maxSessionAllowed: { type: Number, default: Number(process.env.END_USER_DEFAULT_MAX_SESSIONS || 5), select: false },
              
              // dbUri: { type: String },
            //  dbInfo: { type: dbSchema,  required: true, select: false },
              //  keys: { type: keySchema, required: true, select: false },
    // timeLimitations: { type: timeLimitationsSchema, select: false },
               slug: { type: String, default: null },
         activeApps: { type: [String], default: [], enum: ['web', 'android', 'ios'] },
                web: { type: webAppSchema, default: null },
            android: { type: androidAppSchema, default: null },
                ios: { type: iosAppSchema, default: null },
            // domains: { type: [hostSchema], default: [] },
        // socialLinks: { type: [socialLinksSchema], required: false, default: [] },
  //  facebookDataFeed: { type: String, default: null },
             stuffs: { type: [stuffSchema], default: undefined },
        transaction: { type: transactionFieldsSchema },
}, { timestamps: true, collection: 'shops' });


export const shopModel = (db) => db.models.Shop || db.model('Shop', shopSchema);
// export const Shop = mongoose.models.Shop || mongoose.model("Shop", shopSchema, 'shops');
// export default Shop;


