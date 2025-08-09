import { z } from 'zod';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png'];
const MAX_MB = parseInt(process.env.MAX_PRODUCT_IMAGE_FILE_SIZE_MB || "5", 10);
const MAX_FILE_SIZE = MAX_MB * 1024 * 1024;

const fileSchema = z.custom((file) => {
  if (!(file instanceof Blob)) return false;
  if (!file.name || !file.type || typeof file.size !== 'number') return false;

  const ext = file.name.split('.').pop()?.toLowerCase();
  return (
    ALLOWED_MIME_TYPES.includes(file.type) &&
    ALLOWED_EXTENSIONS.includes(ext) &&
    file.size <= MAX_FILE_SIZE
  );
}, {
  message: `Each file must be JPEG or PNG and ≤ ${MAX_MB}MB.`,
});

const uploadLogoDTOSchema = z.object({
  shopId: z.string().nonempty("shopId is required"),
  file: fileSchema,
});

export default uploadLogoDTOSchema;