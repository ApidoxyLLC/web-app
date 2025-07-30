// src/app/api/v1/execute-payment/route.js
import { NextResponse } from "next/server";
import { InvoiceModel } from "@/models/Invoice";
import { TransactionModel } from "@/models/Transaction";
import connectDB from "@/lib/mongodb/connect";
import axios from "axios";

export async function POST(request) {
    await connectDB();
    try {
        const { paymentId, invoiceId } = await request.json();

        if (!paymentId || !invoiceId) {
            return NextResponse.json({ success: false, message: "Missing paymentId or invoiceId" }, { status: 400 });
        }

        // Step 1: Call bKash execute payment API
        const token = await getBkashToken(); // Assume you have this function

        const { data: executeRes } = await axios.post(
            `${process.env.BKASH_BASE_URL}/checkout/payment/execute/${paymentId}`,
            {},
            {
                headers: {
                    Authorization: token,
                    "X-APP-Key": process.env.BKASH_APP_KEY,
                },
            }
        );

        if (executeRes.transactionStatus !== "Completed") {
            await InvoiceModel.findByIdAndUpdate(invoiceId, { paymentStatus: "failed" });
            return NextResponse.json({ success: false, message: "Payment failed" });
        }

        // Step 2: Update Invoice
        const invoice = await InvoiceModel.findByIdAndUpdate(
            invoiceId,
            {
                paymentStatus: "success",
                paymentId: paymentId,
            },
            { new: true }
        );

        // Step 3: Record transaction
        await TransactionModel.create({
            userId: invoice.userId,
            bkashTrxId: executeRes.trxID,
            amount: parseFloat(executeRes.amount),
            invoiceId: invoice._id,
            paymentStatus: "success",
            executedAt: new Date(),
        });

        return NextResponse.json({ success: true, message: "Payment executed successfully" });
    } catch (err) {
        console.error("Payment Execution Error:", err);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
