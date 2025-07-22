import mongoose from 'mongoose';
import cuid from '@bugsnag/cuid';

/* ******************************************
 *  Temporary Unused                        *
 *  Those will need to active later         *
 * ******************************************
const domainsTemplateSchema = new mongoose.Schema({
    referenceId: { type: String, default:()=>cuid(), select: true },
         domain: { type: String, required: true, unique: true, trim: true, lowercase: true, match: /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ },
         zoneId: { type: String, required: true, unique: true, trim: true },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: undefined },
      createdAt: { type: Date, default: Date.now },
}, { 
    // timestamps: true, 
    collection: 'domains_templates'
});
export const domainsTemplateModel = (db) => db.models.DomainsTemplate || db.model('DomainsTemplate', domainsTemplateSchema);

const rootDomainSchema = new mongoose.Schema({
    referenceId: { type: String, default:()=>cuid(), select: true },
         domain: { type: String, required: true, unique: true, trim: true, lowercase: true, match: /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ },
         zoneId: { type: String, required: true, unique: true, trim: true },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: undefined },
      createdAt: { type: Date, default: Date.now },
}, { 
    // timestamps: true, 
    collection: 'root_domains'
});
export const rootDomainModel = (db) => db.models.RootDomain || db.model('RootDomain', rootDomainSchema);
*/


const domainSchema = new mongoose.Schema({
    referenceId: { type: String, default:()=>cuid(), select: true },
         domain: { type: String, required: true, unique: true, trim: true, lowercase: true, match: /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ },
           shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
       isActive: { type: Boolean, default: true },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: undefined },
      createdAt: { type: Date, default: Date.now },
//       isPrimary: { type: Boolean, default: false },
//        parentId: { type: mongoose.Schema.Types.ObjectId, lowercase: true, trim: true },
//    subordinates: { type: [{ type: mongoose.Schema.Types.ObjectId, lowercase: true, trim: true }], default: undefined },
        //  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
}, { 
    // timestamps: true, 
    collection: 'domains'
});
export const domainModel = (db) => db.models.Domain || db.model('Domain', domainSchema);
