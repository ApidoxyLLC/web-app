// import { userModel } from '../models/shop/shop-user/ShopUser.js';
// import { userModel } from '@/models/shop/shop-user/ShopUser';
import { userModel } from '../src/models/shop/shop-user/ShopUser.js';
import mongoose from 'mongoose'; 

const users = [
  {
    name: "Sowrov Kumar",
    gender: "male",
    email: "sowrov@example.com",
    phone: "01700000001",
    currency: "BDT",
    timezone: "Asia/Dhaka",
    status: {
      currentStatus: "active",
      changeAt: new Date(),
      changeReason: "Initial activation",
      changeBy: null,
    },
  },
  {
    name: "Rafiul Hasan",
    gender: "male",
    email: "rafi@example.com",
    phone: "01700000002",
    currency: "USD",
    timezone: "America/New_York",
    status: {
      currentStatus: "pending",
      changeAt: new Date(),
      changeReason: "Email not verified",
      changeBy: null,
    },
  },
  {
    name: "Tania Rahman",
    gender: "female",
    email: "tania@example.com",
    phone: "01700000003",
    currency: "INR",
    timezone: "Asia/Kolkata",
    status: {
      currentStatus: "suspended",
      changeAt: new Date(),
      changeReason: "Policy violation",
      changeBy: null,
    },
  },
  {
    name: "Farhan Mahmud",
    gender: "male",
    email: "farhan@example.com",
    phone: "01700000004",
    currency: "GBP",
    timezone: "Europe/London",
    status: {
      currentStatus: "active",
      changeAt: new Date(),
      changeReason: "Phone verified",
      changeBy: null,
    },
  },
  {
    name: "Lamia Chowdhury",
    gender: "female",
    email: "lamia@example.com",
    phone: "01700000005",
    currency: "EUR",
    timezone: "Europe/Berlin",
    status: {
      currentStatus: "deleted",
      changeAt: new Date(),
      changeReason: "User requested deletion",
      changeBy: null,
    },
  },
  {
    name: "Niloy Ahmed",
    gender: "male",
    email: "niloy@example.com",
    phone: "01700000006",
    currency: "CAD",
    timezone: "America/Toronto",
    status: {
      currentStatus: "initiate",
      changeAt: new Date(),
      changeReason: "Just signed up",
      changeBy: null,
    },
  },
];

async function seedUsers() {
  try {
    const db = await mongoose.connect('mongodb+srv://sowrov:Yy6jBHQufFx3vpbG@apidoxy.f4yxayv.mongodb.net/undefined_6880859d9325ef7878974f1b_db?retryWrites=true&w=majority&appName=apidoxy');
    const User = userModel(mongoose);

    await User.insertMany(users);
    console.log("✅ User seeding done!");
    await mongoose.disconnect();
  } catch (err) {
    console.error("❌ Error seeding users:", err);
  }
}

seedUsers();
