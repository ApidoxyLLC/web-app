import mongoose from 'mongoose';
import cuid from '@bugsnag/cuid';

const domainSchema = new mongoose.Schema(
    {  referenceId: { type: String, default: ()=> cuid() },
            domain: { type: String, required: true, unique: true, lowercase: true, trim: true, validate: { validator: function(v) {return /^([a-z0-9-]+\.)*[a-z0-9-]+\.[a-z]{2,}$/.test(v)}, message: props => `${props.value} is not a valid domain!`} },
         isPrimary: { type: Boolean, default: false },
          parentId: { type: mongoose.Schema.Types.ObjectId, lowercase: true, trim: true },
      subordinates: { type: [{ type: mongoose.Schema.Types.ObjectId, lowercase: true, trim: true }], default: undefined },
            status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
        sslEnabled: { type: Boolean, default: false },
    sslCertificate: { type: String, required: false, trim: true },
              shop: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Shop' },
         createdBy: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'User' },
    }, { timestamps: true, }
);
export const domainModel = (db) => db.models.Domain || db.model('Domain', domainSchema);
