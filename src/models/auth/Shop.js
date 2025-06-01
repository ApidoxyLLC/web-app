import mongoose from 'mongoose';

// const dbInfoSchema = new mongoose.Schema({
//     storageType: { type: [String], enum: ['individual-cluster', 'individual-database', 'shared-cluster', 'shared-database', 'self-hosted', 'other'], default: undefined },
//     clusterName: { type: String, default: undefined },
//     databaseName: { type: String, default: undefined },
//     connectionString: { type: String, default: undefined },
//     host: { type: String, default: undefined },
//     port: { type: Number, default: undefined },
//     provider: { type: String, enum: ['aws', 'gcp', 'azure', 'atlas', 'self-hosted', 'other'], default: undefined },
//     region: { type: String, default: undefined},
//     auth: {   username: { type: String, default: undefined },
//               password: { type: String, default: undefined },
//              mechanism: { type: String, default: undefined } },
//     sslEnabled: { type: Boolean, default: undefined },
//     replicaSet: { type: String, default: undefined },
//     backupPolicy: { enabled: { type: Boolean, default: undefined },
//                   frequency: { type: String, default: undefined },
//               retentionDays: { type: Number, default: undefined},
//                   },
//     version: { type: String, default: undefined },
//     tags: { type:[String], default: undefined }, 
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
}, { timestamps: true });

const baseAppSchema = new mongoose.Schema({
  appId: { type: String, required: true, index: true },
  appSlug: { type: String, default: undefined},
  appName: { type: String, required: true },
  appIcon: { type: String, required: true },
  email: { type: String, required: false, default: undefined },
  phone: { type: String, required: false, default: undefined },
  version: { type: String, default: undefined },
  status: { type: String, default: 'pending',
                          enum: ['active', 'inactive', 'pending', 'on-build', 'prepared'] },
  language: { type: String, enum: ['en_US', 'bn_BD' ], default: 'en_US' },
  appUrl: { type: String, required: false, default: undefined },  

  contactUs: { type: String, default: undefined },
  settings: appSettingsSchema,
  // socialLinks: socialLinksSchema,
  extraPolicies: [extraPolicySchema], 
  siteMap: { type: String, default: undefined },
  

  // recommend to remove
  // aboutUs: { type: String, default: undefined },
  // termsAndConditions: { type: String, default: undefined },
  // privacyPolicy: { type: String, default: undefined },
  // refundPolicy: { type: String, default: undefined },
  
// Delivery include here 

// Payment Settings apply here
}, { timestamps: true });


const buildInfoSchema = new mongoose.Schema({ 
  buildNo:{ type:String, default:0 },
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
  // buildCount:{ type: Number, default: 0 }
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
      dbName: { type: String, default: 'mongodb' }
}, { timestamps: false });

const keySchema = new mongoose.Schema({
           ACCESS_TOKEN_SECRET: { type: String, required: true },
          REFRESH_TOKEN_SECRET: { type: String, required: true }, 

   ACCESS_TOKEN_EXPIRE_MINUTES: { type: Number, required: true, default: Number(process.env.END_USER_ACCESS_TOKEN_DEFAULT_EXPIRE_MINUTES || 15 ) }, 
  REFRESH_TOKEN_EXPIRE_MINUTES: { type: Number, required: true, default: Number(process.env.END_USER_REFRESH_TOKEN_DEFAULT_EXPIRE_MINUTES || 10080) }, 

  // ACCESS_TOKEN_ENCRYPTION_KEY: { type: String, required: true },
  // REFRESH_TOKEN_ENCRYPTION_KEY: { type: String, required: true },
 
}, { timestamps: false })

const shopSchema = new mongoose.Schema({
            ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
           vendorId: { type: mongoose.Schema.Types.ObjectId, required: true },
  ownerLoginSession: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Session' },

            country: { type: String, required: true },
           industry: { type: String, required: true },
       businessName: { type: String, required: true },
           location: { type: String, required: true },

             dbInfo: { type: dbSchema,  required: true, select: false },
               keys: { type: keySchema, required: true, select: false },

               slug: { type: String, default: undefined },
         activeApps: { type: [String], required: false, default: undefined, enum: ['web', 'android', 'ios'] },
                web: { type: webAppSchema, default: undefined },
            android: { type: androidAppSchema, default: undefined },
                ios: { type: iosAppSchema, default: undefined },

        socialLinks: { type: [socialLinksSchema], required: false, default: [] },
   facebookDataFeed: { type: String, default: undefined },

}, { timestamps: true, collection: 'shops' });


export const shopModel = (db) => db.models.Shop || db.model('Shop', shopSchema);
export const Shop = mongoose.models.Shop || mongoose.model("Shop", shopSchema, 'shops');
export default Shop;


