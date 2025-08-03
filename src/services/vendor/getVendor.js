
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import { vendorModel } from "@/models/vendor/Vendor";
import { decrypt } from "@/lib/encryption/cryptoEncryption";
import config from "../../../config";

const defaultFields = ['_id', 'email', 'dbInfo', 'secrets', 'expirations'];
// ['secrets', 'timeLimitations', 'status'] 

function buildProjection(fields = []) {
  const merged = Array.from(new Set([...defaultFields, ...fields]));
  return merged.join(' ');
}
export async function getVendor({ id, host, fields = []  }) {
  if (!id && !host) 
    throw new Error("Missing vendor identifier or host");

  const vendor_db = await vendorDbConnect();
  const    Vendor = await vendorModel(vendor_db);
  const projection = buildProjection(fields);
  const vendor = await Vendor.findOne({
                                        $or: [   id ? {   referenceId: id } : null,
                                               host ? { primaryDomain: host } : null,
                                               host ? {       domains: { $in: [host] } } : null,
                                            ].filter(Boolean),
                                    })
                             .select(projection)
                             .lean();

  if (!vendor) 
    throw new Error("Vendor not found");

  const dbUri = await decrypt({
    cipherText: vendor.dbInfo.dbUri,
    options: { secret: config.vendorDbUriEncryptionKey },
  });

  return {
    vendor,
    dbUri,
    dbName: vendor.dbInfo.dbName,
  };
}