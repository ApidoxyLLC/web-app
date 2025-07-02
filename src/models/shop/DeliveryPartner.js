const mongoose = require('mongoose');

const deliveryPartnerSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Partner name is required'], trim: true },
  logo: { type: String, default:undefined},
  code: { type: String, required: [true, 'Unique partner code is required'], unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['courier', 'pickup', 'drop-off'], required: true },
  countryCoverage: { type: [String], default: [] },
  contactDetails: { supportPhone: String, supportEmail: String, website: String},
  serviceablePincodes: { type: [String], default: undefined },
  pricingPolicy: {
    baseRate: { type: Number, default: 0 },
    percentage: {type: Number, default: undefined},
    ratePerKg: { type: Number, default: 0 },
    minOrderValue: { type: Number, min: 0 },
    extraCharges: {
      fuelSurcharge: { type: Number, default: 0 },
      remoteAreaCharge: { type: Number, default: 0 },
      other: { type: String }
    }
  },
  cancellationPolicy: {
    penaltyRate:{ type: Number, default: undefined},
    minPenelty: { type: Number, default: undefined},
    freeCancellationPeriod: { type: Number, min: 0 } 
  },
  serviceLevelAgreement: {
    deliveryTime: { type: Number }, // in hours
    pickupTime: { type: Number }, // in hours
    returnWindow: { type: Number } // in days
  },
  tracking: {
    apiSupported: { type: Boolean, default: false },
    trackingUrlFormat: { type: String, default: '' },
    updateFrequency: { type: Number }
  },
  integration: {
    apiKey: { type: String, select: false },
    apiSecret: { type: String, select: false },
    baseUrl: String,
    webhookUrl: String,
    authType: { type: String, default: 'none',
      enum: ['basic', 'bearer', 'hmac', 'none'] },
    docsLink: String
  },
    status: {
        active: { type: Boolean, default: true },
        operationalStatus: { type: String, default: 'available',
                enum: ['available', 'unavailable', 'overloaded', 'maintenance'] },
        verification: {
            status: { type: String, default: 'pending',
                enum: ['pending', 'verified', 'rejected']},
            documents: [{ type: { type: String }, url: String, verified: Boolean }]
            }
  },
  serviceTypes: { type: [String], default: ['standard'],
    enum: ['standard', 'express', 'cod', 'reverse'] },
  capacity: {
    dailyOrders: { type: Number, min: 0 },
    maxWeight: { type: Number, min: 0 }, // in kg
    maxVolume: { type: Number, min: 0 }  // in m³
},
  deliveryTimeEstimates: {
    average: String,
    domestic: String,     // e.g. '2-4 days'
    international: String // e.g. '5-10 days'
  },
  paymentTerms: {
    settlement: { type: String, enum: ['daily', 'weekly', 'bi-weekly', 'monthly'] },
    advancePayment: { type: Boolean, default: false },
    creditLimit: { type: Number, min: 0 }
  },  
  rating: { type: Number, min: 0, max: 5, default: 0},
  notes: { type: String, default: '' }
}, {
  timestamps: true,
  collection: 'delivery_partners'
});

export const deliveryPartnerModel = (db) => db.models.DeliveryPartner || db.model('DeliveryPartner', deliveryPartnerSchema);