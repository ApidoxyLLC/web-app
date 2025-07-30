import { z } from 'zod';

const transactionDTOSchema = z.object({
    userId: z.string().min(1, "User ID is required"),
    invoiceId: z.string().min(1, "Invoice ID is required"),

    paymentID: z.string().min(1, "Payment ID is required"),
    trxID: z.string().min(1, "Transaction ID is required"),
    transactionStatus: z.enum(["Completed", "Failed", "Cancelled"]),

    amount: z.string().min(1, "Amount is required"),
    currency: z.string().default("BDT"),

    paymentExecuteTime: z.string().optional(), // ISO string or timestamp
    paymentMethod: z.literal("bKash"),

    gatewayResponse: z.any().optional(), // Optional raw response for reference
});

export default transactionDTOSchema;
