const { z } = require('zod');

export const logoDTOSchema = z.object({
  shop: z.string(),
  image: z.string(),
})
export default logoDTOSchema;