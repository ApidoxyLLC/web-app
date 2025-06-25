import { z } from "zod";

const shippingAddressSchema = z.object({
        name: z.string().min(1, "Recipient name is required"),
       phone: z.string().min(10, "Phone number is required"),
      street: z.string().min(1, "Street is required"),
        city: z.string().min(1, "City is required"),
       state: z.string().optional(),
  postalCode: z.string().min(4, "Postal code is required"),
     country: z.string().min(2, "Country is required")              });

export const orderDTOSchema = z.object({
   shippingMethod: z.string().min(1, "Shipping method is required"),
  shippingAddress: shippingAddressSchema,
    paymentMethod: z.enum(["card", "cod", "paypal", "stripe"], { errorMap: () => ({ message: "Invalid payment method" }) }) });

export default orderDTOSchema;