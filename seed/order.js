
import mongoose from 'mongoose';
import { orderModel } from '../src/models/shop/product/Order.js'; // or paste inline

const dummyOrders = [
  {
    userId: new mongoose.Types.ObjectId("64fbc8a56ad6a7e1326a9d21"),
    cartId: "cart_001",
    items: [
      {
        productId: new mongoose.Types.ObjectId("64fbc8a56ad6a7e1326a9d41"),
        variantId: new mongoose.Types.ObjectId("64fbc8a56ad6a7e1326a9e11"),
        quantity: 2,
        price: { basePrice: 150, currency: "BDT" },
        subtotal: 300,
        title: "T-Shirt",
        image: "https://dummyimage.com/300"
      }
    ],
    totals: { subtotal: 300, discount: 50, tax: 15, deliveryCharge: 30, grandTotal: 295, currency: "BDT" },
    discounts: [
      {
        couponId: "c1",
        code: "WELCOME50",
        type: "fixed_amount",
        amount: 50,
        appliedTo: {
          type: "cart",
          products: [],
          categories: []
        }
      }
    ],
    shipping: {
      address: {
        street: "123 Main Street",
        city: "Dhaka",
        postalCode: "1216",
        country: "Bangladesh",
        region: "Dhaka"
      },
      phone: "01700000000",
      notes: "Call before delivery",
      method: "standard",
      cost: 30,
      shippingStatus: "pending",
      trackingNumber: "TRK001"
    },
    payment: {
      method: "bkash",
      status: "paid",
      transactionId: "TXN001",
      processedAt: new Date("2025-08-04T17:00:00Z")
    },
    orderStatus: "confirmed",
    ip: "103.56.100.1",
    userAgent: "Mozilla/5.0"
  },

  {
    userId: new mongoose.Types.ObjectId("64fbc8a56ad6a7e1326a9d22"),
    cartId: "cart_002",
    items: [
      {
        productId: new mongoose.Types.ObjectId("64fbc8a56ad6a7e1326a9d42"),
        quantity: 1,
        price: { basePrice: 500, currency: "BDT" },
        subtotal: 500,
        title: "Bluetooth Speaker",
        image: "https://dummyimage.com/301"
      }
    ],
    totals: { subtotal: 500, discount: 0, tax: 25, deliveryCharge: 40, grandTotal: 565, currency: "BDT" },
    shipping: {
      address: {
        street: "456 Another Road",
        city: "Chattogram",
        country: "Bangladesh"
      },
      method: "express",
      cost: 40,
      shippingStatus: "in_transit",
      trackingNumber: "TRK002"
    },
    payment: {
      method: "cod",
      status: "pending"
    },
    orderStatus: "processing"
  },

  {
    userId: new mongoose.Types.ObjectId("64fbc8a56ad6a7e1326a9d23"),
    cartId: "cart_003",
    items: [
      {
        productId: new mongoose.Types.ObjectId("64fbc8a56ad6a7e1326a9d43"),
        quantity: 3,
        price: { basePrice: 200, currency: "BDT" },
        subtotal: 600,
        title: "Notebook",
        image: "https://dummyimage.com/302"
      }
    ],
    totals: { subtotal: 600, discount: 60, tax: 18, deliveryCharge: 50, grandTotal: 608, currency: "BDT" },
    discounts: [
      {
        couponId: "c2",
        code: "NOTE60",
        type: "percentage_off",
        amount: 60,
        appliedTo: {
          type: "products",
          products: [new mongoose.Types.ObjectId("64fbc8a56ad6a7e1326a9d43")],
          categories: []
        }
      }
    ],
    shipping: {
      address: {
        street: "789 Lake Road",
        city: "Sylhet",
        country: "Bangladesh"
      },
      method: "pickup",
      cost: 50,
      shippingStatus: "delivered",
      trackingNumber: "TRK003"
    },
    payment: {
      method: "nagad",
      status: "paid",
      transactionId: "TXN003",
      processedAt: new Date("2025-08-04T17:00:00Z")
    },
    orderStatus: "delivered"
  },

  {
    userId: new mongoose.Types.ObjectId("64fbc8a56ad6a7e1326a9d24"),
    cartId: "cart_004",
    items: [
      {
        productId: new mongoose.Types.ObjectId("64fbc8a56ad6a7e1326a9d44"),
        quantity: 1,
        price: { basePrice: 1000, currency: "USD" },
        subtotal: 1000,
        title: "Laptop Bag",
        image: "https://dummyimage.com/303"
      }
    ],
    totals: { subtotal: 1000, discount: 0, tax: 100, deliveryCharge: 60, grandTotal: 1160, currency: "USD" },
    shipping: {
      address: {
        street: "55 Silicon Ave",
        city: "Rajshahi",
        country: "Bangladesh"
      },
      method: "express",
      cost: 60,
      shippingStatus: "pending"
    },
    payment: {
      method: "stripe",
      status: "paid",
      transactionId: "TXN004"
    },
    orderStatus: "confirmed"
  },

  {
    userId: new mongoose.Types.ObjectId("64fbc8a56ad6a7e1326a9d25"),
    cartId: "cart_005",
    items: [
      {
        productId: new mongoose.Types.ObjectId("64fbc8a56ad6a7e1326a9d45"),
        quantity: 4,
        price: { basePrice: 120, currency: "BDT" },
        subtotal: 480,
        title: "Pen",
        image: "https://dummyimage.com/304"
      }
    ],
    totals: { subtotal: 480, discount: 30, tax: 14, deliveryCharge: 20, grandTotal: 484, currency: "BDT" },
    discounts: [
      {
        couponId: "c3",
        code: "PEN30",
        type: "fixed_amount",
        amount: 30,
        appliedTo: {
          type: "cart",
          products: [],
          categories: []
        }
      }
    ],
    shipping: {
      address: {
        street: "Plot 10, Bashundhara",
        city: "Dhaka",
        country: "Bangladesh"
      },
      method: "standard",
      cost: 20,
      shippingStatus: "delivered",
      trackingNumber: "TRK005"
    },
    payment: {
      method: "bkash",
      status: "paid",
      transactionId: "TXN005"
    },
    orderStatus: "shipped"
  }
];



const dbURI = 'mongodb+srv://sowrov:Yy6jBHQufFx3vpbG@apidoxy.f4yxayv.mongodb.net/s_68a4519bb40637386ecb5cae?retryWrites=true&w=majority&appName=apidoxy'
const insertDummyOrders = async () => {
  try {
    await mongoose.connect(dbURI);
    const Order = orderModel(mongoose.connection);
    const result = await Order.insertMany(dummyOrders);
    console.log(`✅ Inserted ${result.length} orders.`);
    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Failed to insert orders:", error);
  }
};

insertDummyOrders();
