import { z } from 'zod';

export const uploadAPKFileDTOSchema = z.object({
  file: z.any().refine((file) => file && file.name.endsWith('.apk'), { message: 'File must be an APK'}),
  shop: z.string().min(1, 'Shop ID is required'),
  version: z.string().optional(),
  releaseNotes: z.string().min(1, 'Release notes are required').max(1000).optional(),
});

export default uploadAPKFileDTOSchema;