import { cartModel } from "@/models/shop/product/Cart";
import mongoose from "mongoose";

const dummyCart = {
  cartId: "cart_2025",
  userId: new mongoose.Types.ObjectId("64fbc8a56ad6a7e1326a9f99"),
  sessionId: undefined, 
  items: [
    {
      productId: new mongoose.Types.ObjectId("64fbc8a56ad6a7e1326p001"),
      variantId: new mongoose.Types.ObjectId("64fbc8a56ad6a7e1326v001"),
      quantity: 2,
      price: { basePrice: 250, currency: "BDT" },
      subtotal: 500,
      added_at: new Date(),
    },
    {
      productId: new mongoose.Types.ObjectId("64fbc8a56ad6a7e1326p002"),
      variantId: new mongoose.Types.ObjectId("64fbc8a56ad6a7e1326v002"),
      quantity: 1,
      price: { basePrice: 1200, currency: "BDT" },
      subtotal: 1200,
      added_at: new Date(),
    },
    {
      productId: new mongoose.Types.ObjectId("64fbc8a56ad6a7e1326p003"),
      variantId: new mongoose.Types.ObjectId("64fbc8a56ad6a7e1326v003"),
      quantity: 3,
      price: { basePrice: 100, currency: "BDT" },
      subtotal: 300,
      added_at: new Date(),
    },
  ],
  totals: {
    subtotal: 2000, 
    discount: 200,
    tax: 60,
    deliveryCharge: 50,
    discountBreakdown: { code: "SAVE200", amount: 200 },
    grandTotal: 1910, 
  },
  currency: "BDT",
  lastUpdated: new Date(),
};

const dbUri = ""

const insertCard = async () => {
    try{
        await mongoose.connect(dbUri)
        const Cart = new cartModel(dummyCart)
        await Cart.save()
        console.log("Dummy cart stored successfully!");
        mongoose.connection.close();
    }catch(err){
        console.error("Error:", err);
    }
}
insertCard()