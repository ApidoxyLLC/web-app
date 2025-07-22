import { z } from "zod";

export const uploadImageFileDTOSchema = z.object({
  file: z.instanceof(File)
         .refine(file => file.size <= 5 * 1024 * 1024, "File must be ≤ 5MB")
         .refine(file => ["image/jpeg", "image/png", "application/pdf"].includes(file.type), "Only JPEG, PNG, or PDF files allowed"),
  shop: z.string().regex(/^[a-f\d]{24}$/i, "Invalid Shop ID (must be 24-character hex)"),
});
export default uploadImageFileDTOSchema;