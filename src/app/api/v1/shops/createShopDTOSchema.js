import { z } from "zod";

//   ownerId: z.string(),
//   country: z.string(),
//   industry: z.string(),
//   name: z.string().trim(),
//   location: z.string(),
//   slug: z.string().optional(),
//   activeApps: z.array(z.enum(['web', 'android', 'ios'])).optional(),
//   web: webAppSchema.optional(),
//   android: androidAppSchema.optional(),
//   ios: iosAppSchema.optional(),
//   dbInfo: z.object({
//     storageType: z.array(z.enum(['individual-cluster', 'individual-database', 'shared-cluster', 'shared-database', 'self-hosted', 'other'])).optional(),
//     clusterName: z.string().optional(),
//     databaseName: z.string().optional(),
//     connectionString: z.string().optional(),
//     host: z.string().optional(),
//     port: z.number().optional(),
//     provider: z.enum(['aws', 'gcp', 'azure', 'atlas', 'self-hosted', 'other']).optional(),
//     region: z.string().optional(),
//     auth: z.object({
//       username: z.string().optional(),
//       password: z.string().optional(),
//       mechanism: z.string().optional()
//     }).optional(),
//     sslEnabled: z.boolean().optional(),
//     replicaSet: z.string().optional(),
//     backupPolicy: z.object({
//       enabled: z.boolean().optional(),
//       frequency: z.string().optional(),
//       retentionDays: z.number().optional()
//     }).optional(),
//     version: z.string().optional(),
//     tags: z.array(z.string()).optional()
//   }).optional()

export const createShopDTOSchema = z
  .object({
    country: z.string(),
    industry: z.string(),
    businessName: z.string().trim(),
    location: z.string().trim(),
  })
  

  export default createShopDTOSchema;