
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import { vendorModel } from "@/models/vendor/Vendor";
import { decrypt } from "@/lib/encryption/cryptoEncryption";
import config from "../../../config";
import { getCache, setCache } from "@/lib/redis/helpers/vendor";



export async function getInfrastructure({ referenceId, host }) {
  if (!referenceId && !host) throw new Error("Missing vendor identifier or host");

  // 1️⃣ Try cache first
  const cached = await getCache({ segment: 'infrastructure', domain: host, referenceId });
  if (cached.success) {
    try {
      const dbUri = await decrypt({ cipherText: cached.data.dbInfo.dbUri,
                                       options: { secret: config.vendorDbUriEncryptionKey }, });
      return {   data: cached.data,
                dbUri,
               dbName: cached.data.dbInfo.dbName  };
    } catch (error) { console.error('Decryption failed:', error); }
  }

  // 2️⃣ Cache miss but resolved ID exists → fetch by _id
  const vendor_db = await vendorDbConnect();
  const Vendor = await vendorModel(vendor_db);

  let vendor;
  if (cached.id) {
    vendor = await Vendor.findById(cached.id)
                         .select("_id ownerId email phone referenceId dbInfo bucketInfo primaryDomain domains secrets expirations maxSessionAllowed")
                         .lean();
    console.log("fetch by id ")
    console.log(vendor)
  }
    
    else{ 
      console.log(referenceId)
      vendor = await Vendor.findOne({ $or: [ referenceId ? {   referenceId                  } : null,
                                                    host ? { primaryDomain: host            } : null,
                                                    host ? {       domains: { $in: [host] } } : null,
                                            ].filter(Boolean),
                                    })
                          .select("_id ownerId email phone referenceId dbInfo bucketInfo primaryDomain domains secrets expirations maxSessionAllowed")
                          .lean();
    console.log("fetch by reference ")
      
      console.log(vendor)
  }
  

  if (!vendor) throw new Error("Vendor not found");

  // console.log(vendor)
  const domains = new Set([vendor.primaryDomain, ...(vendor.domains || [])]);

  // 3️⃣ Populate cache
  await setCache({     segment: 'infrastructure',
                       domains: Array.from(domains),
                   referenceId: vendor.referenceId,
                            id: vendor._id,
                       payload: {             email: vendor.email,
                                              phone: vendor.phone,
                                             dbInfo: vendor.dbInfo,
                                         bucketInfo: vendor.bucketInfo,
                                            secrets: vendor.secrets,
                                      primaryDomain: vendor.primaryDomain,
                                            domains: vendor.domains,
                                        expirations: vendor.expirations,
                                  maxSessionAllowed: vendor.maxSessionAllowed },
                });

  // 4️⃣ Decrypt DB URI before returning
  const dbUri = await decrypt({ cipherText: vendor.dbInfo.dbUri,
                                options: { secret: config.vendorDbUriEncryptionKey }, });

  return {    data: {
                        ...(vendor.email             && {             email: vendor.email             }),
                        ...(vendor.phone             && {             phone: vendor.phone             }),
                        ...(vendor.dbInfo            && {            dbInfo: vendor.dbInfo            }),
                        ...(vendor.secrets           && {           secrets: vendor.secrets           }),
                        ...(vendor.expirations       && {       expirations: vendor.expirations       }),
                        ...(vendor.maxSessionAllowed && { maxSessionAllowed: vendor.maxSessionAllowed }),
                        ...(vendor.domains           && {           domains: vendor.domains           }),
                        ...(vendor._id               && {                id: vendor._id               }),
                        ...(vendor.secrets           && {           secrets: vendor.secrets           }),
                    },
             dbUri,
            dbName: vendor.dbInfo.dbName };
}

























// const defaultFields = ['_id', 'ownerId', 'email', 'dbInfo', 'secrets', 'expirations'];
// ['secrets', 'timeLimitations', 'status'] 

// function buildProjection(fields = []) {
//   const merged = Array.from(new Set([...defaultFields, ...fields]));
//   return merged.join(' ');
// }

// export async function getInfrastructure({ id, host, fields = []  }) {
//   if (!id && !host) 
//     throw new Error("Missing vendor identifier or host");

//   const vendor_db = await vendorDbConnect();
//   const    Vendor = await vendorModel(vendor_db);
//   const vendor = await Vendor.findOne({
//                                         $or: [   id ? {   referenceId: id } : null,
//                                                host ? { primaryDomain: host } : null,
//                                                host ? {       domains: { $in: [host] } } : null,
//                                             ].filter(Boolean),
//                                     })
//                              .select("_id ownerId referenceId  dbInfo bucketInfo primaryDomain domains secrets expirations maxSessionAllowed")
//                              .lean();

//   if (!vendor) 
//     throw new Error("Vendor not found");

// const domains = new Set([ ...vendor.domains, vendor.primaryDomain])

//   await setCache({  segment: 'infrastructure',
//                     domains,
//                 referenceId:  vendor.referenceId,
//                          id: vendor._id,
//                     payload: {            dbInfo: vendor.dbInfo,  
//                                       bucketInfo: vendor.bucketInfo, 
//                                          secrets: vendor.secrets, 
//                                      expirations: vendor.expirations, 
//                                maxSessionAllowed: vendor.maxSessionAllowed }
// });

//   const dbUri = await decrypt({
//     cipherText: vendor.dbInfo.dbUri,
//     options: { secret: config.vendorDbUriEncryptionKey },
//   });

//   return {
//     vendor,
//     dbUri,
//     dbName: vendor.dbInfo.dbName,
//   };
// }