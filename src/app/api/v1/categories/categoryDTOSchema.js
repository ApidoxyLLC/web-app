const { z } = require('zod');
const mongoose = require('mongoose');

const objectIdSchema = z.string().refine((val) => isValidObjectId(val), {
  message: "Invalid ObjectId format"
});

export const categoryDTOSchema = z.object({
  shop: z.string(),
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
  parent: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), { message: "Invalid parent category ID" }).optional().nullable(),
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
