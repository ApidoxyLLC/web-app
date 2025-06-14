const { z } = require('zod');
const mongoose = require('mongoose');


export const categoryDTOSchema = z.object({
  vendorId: z.string().length(32),
  title: z.string().min(1, { message: "Title is required" }).max(100, { message: "Title cannot exceed 100 characters" }).trim(),
  slug: z.string().min(1, { message: "Slug is required" }).max(100, { message: "Slug cannot exceed 100 characters" })
                  .regex(/^[a-z0-9\-]+$/, { message: "Slug can only contain lowercase letters, numbers and hyphens" })
                  .trim().transform(val => val.toLowerCase()).optional(),
  description: z.string().max(500, { message: "Description cannot exceed 500 characters" }).trim().optional(),

  image: z.object({ url: z.string().url({ message: "Invalid image URL" }).optional(),
                    alt: z.string().max(125, { message: "Alt text cannot exceed 125 characters" }).optional(),
                    width: z.number().int().positive().optional(),
                    height: z.number().int().positive().optional()
                }).optional(),
  parent: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), { message: "Invalid parent category ID" })
            .optional().nullable(),
  isActive: z.boolean().default(true),
  metaTitle: z.string().max(70, { message: "Meta title cannot exceed 70 characters" }).trim().optional(),
  metaDescription: z.string().max(160, { message: "Meta description cannot exceed 160 characters" }).trim().optional(),
  keywords: z.array(z.string().trim().transform(val => val.toLowerCase())).optional(),
  metadata: z.record(z.string()).optional(),
})
// .superRefine(async (data, ctx) => {
//   if (data.slug) {
//     const existing = await mongoose.model('Category').findOne({ slug: data.slug });
//     if (existing) {
//       ctx.addIssue({
//         code: z.ZodIssueCode.custom,
//         message: "Slug is already in use",
//         path: ["slug"]
//       });
//     }
//   }

//   if (data.parent) {
//     const exists = await mongoose.model('Category').exists({ _id: data.parent });
//     if (!exists) {
//       ctx.addIssue({
//         code: z.ZodIssueCode.custom,
//         message: "Parent category not found",
//         path: ["parent"]
//       });
//     }
//   }
// });
