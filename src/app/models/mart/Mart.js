import mongoose from 'mongoose';

const socialLinksSchema = new mongoose.Schema({
  facebook: { type: String },
  twitter: { type: String },
  telegram: { type: String },
  discord: { type: String },
  whatsapp: { type: String },
  instagram: { type: String },
  linkedin: { type: String },
  youtube: { type: String },
  tiktok: { type: String },
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
  language: { type: String, enum: ['en_US', 'bn_BD' ], default: 'en' },
  appUrl: { type: String, required: false, default: undefined },  


  contactUs: { type: String, default: undefined },
  settings: appSettingsSchema,
  socialLinks: socialLinksSchema,
  extraPolicies: [extraPolicySchema], 
  siteMap: { type: String, default: undefined },
  facebookDataFeed: { type: String, default: undefined },

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
  firebaseJSONData: String
  // buildHistory:[{ si_no:{type:String, required:true}, version:}]
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

const martSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: [true, 'Owner ID is required'], index: true },
  country: { type: String, required: true},
  industry: { type: String, required: true },
  name: {  type: String, required: true, trim: true},
  location: { type: String, required: true },
  slug: { type: String, default: undefined},
  activeApps: {  type: [String], required: false, default: undefined, enum: ['web', 'android', 'ios'] },
  web: {  type: webAppSchema, default: undefined},
  android: { type: androidAppSchema, default: undefined },
  ios: { type: iosAppSchema },
  dbInfo: {
    storageType: {
      type: [String],
      enum: ['individual-cluster', 'individual-database', 'shared-cluster', 'shared-database', 'self-hosted', 'other']
    },
    clusterName: String,
    databaseName: String,
    connectionString: String,
    host: String,
    port: Number,
    provider: { 
      type: String, 
      enum: ['aws', 'gcp', 'azure', 'atlas', 'self-hosted', 'other']
    },
    region: String,
    auth: {
      username: String,
      password: String,
      mechanism: String,
    },
    sslEnabled: Boolean,
    replicaSet: String,
    backupPolicy: {
      enabled: Boolean,
      frequency: String,
      retentionDays: Number,
    },
    version: String,
    tags: [String],                    
  }
}, { timestamps: true, collection: 'marts' });

export const Mart = mongoose.models.Mart || mongoose.model("Mart", martSchema, 'marts');
export default Mart;


// const projectSchema = new mongoose.Schema({
//     ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
//     country: { type: String, required: true },
//     industry: { type: String, required: true },
//     name: { type: String, required: true },
//     location: { type: String, required: true },
    
//     activeApps: { type: [String], enum: ['web', 'android', 'ios'], required: true, default: ['android'] },
//     android: { 
//             appId: { type: String, required: true },
//             appName: {type: String, required: true },
//             appIcon: { type: String, required: true },
//             packageName: { type: String, required: true },
//             email: { type: String, required: true },
//             phone: { type: String, required: true },
//             version: { type: String, required: false, default: undefined },
//             status: { type: String, enum: ['active', 'inactive', 'pending', 'on-build', 'prepared'], default: 'pending' },
//             language: { type: String, enum: ['en'], default: 'en'},
//             appUrl: { type: String, required: true },
//             settings: {
//                 templates: { type: String, enum: ['desiree', 'stylo'], default: 'desiree' },
//                 color: { type: String, required: true },
//                 notifications: { type: Boolean, default: true },                
//                 },
//             aboutUs:{ type:String },
//             termsAndConditions:{ type:String },
//             privacyPolicy:{ type:String },
//             refundPolicy:{ type:String },
//             contactUs:{ type:String },
//             socialLinks: {
//                 facebook: { type: String },
//                 twitter: { type: String },
//                 telegram: { type: String },
//                 discord: { type: String },
//                 whatsapp: { type: String },
//                 instagram: { type: String },
//                 linkedin: { type: String },
//                 youtube: { type: String },
//                 tiktok: { type: String },
//                 amazon: { type: String },
//                 walmart: { type: String },
//                 alibaba: { type: String },
//             },
//             extraPolicies: [ {
//               type: {type: String},
//               title: {type: String},
//               description: {type: String},
//               url: {type: String},
//               status: {type: String, enum: ['active', 'inactive', 'draft'], default: 'inactive'},
//               createdAt: { type: Date, default: Date.now },
//               updatedAt: { type: Date, default: Date.now },
//               deletedAt: { type: Date, default: null },
//               isDeleted: { type: Boolean, default: false },
//               deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
//               deletedReason: { type: String, default: null },
//             } ]
//         },
// }, {
//   collection: 'projects'
// });
