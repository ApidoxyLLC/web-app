const { execSync } = require("child_process");

// --- CONFIG ---
const DB_NAME = "mongodb+srv://apidoxy_dev_team:XFSTVIrYiZ0nIwOy@cluster0.fh2lmnv.mongodb.net/shop_687b8e527d167d583b73b9f2_db?retryWrites=true&w=majority&appName=Cluster0";          // 🔧 Replace with your DB name
const COLLECTION = "products";         // Collection name
// ----------------

// Sample products shaped according to your schema
const sampleProducts = [
  {
    slug: "tshirt-red",
    title: "Red T-Shirt",
    description: "A stylish red t-shirt made from 100% cotton.",
    tags: ["tshirt", "clothing", "red"],
    gallery: [
      { id: 1, fileName: "red_tshirt.jpg", alt: "Red T-Shirt", position: 1 },
    ],
    otherMediaContents: [
      { type: "image", url: "https://example.com/red_tshirt.jpg", about: "Main product image" },
    ],
    price: {
      currency: "USD",
      base: 25,
      compareAt: 30,
      cost: 15,
      profit: 10,
      margin: 40,
      discount: { type: "percentage", value: 20 },
      minPrice: 20,
      maxPrice: 30,
    },
    thumbnail: "https://example.com/red_tshirt_thumb.jpg",
    options: ["size", "color"],
    details: {
      material: "Cotton",
      fit: "Regular",
      fabricWeight: "180gsm",
      neckLine: "Round",
      madeIn: "Bangladesh",
      dimensions: "40x60 cm",
      careInstructions: "Machine wash cold",
    },
    hasVariants: true,
    isAvailable: true,
    warranty: { duration: 12, termsNdConditions: "1 year manufacturer warranty" },
    status: "active",
    approvalStatus: "approved",
    productFormat: "physical",
    weight: "500",
    weightUnit: "g",
    hasFreeShipment: true,
    sellWithOutStock: false,
    shipping: {
      weight: 0.5,
      dimensions: { length: 40, width: 30, height: 2 },
      freeShipping: true,
      shippingClass: "Standard",
    },
    ratings: { average: 4.5, count: 10 },
    isFeatured: true,
    variants: [
      {
        options: ["Red", "M"],
        price: { currency: "USD", base: 25 },
      },
      {
        options: ["Red", "L"],
        price: { currency: "USD", base: 27 },
      },
    ],
    reviews: [],
    productUrl: "https://example.com/products/tshirt-red",
    publishedAt: new Date(),
    metadata: {
      title: "Red T-Shirt",
      description: "Shop stylish red t-shirts online.",
      canonicalUrl: "https://example.com/products/tshirt-red",
    },
  },
  {
    slug: "ebook-javascript",
    title: "JavaScript Mastery eBook",
    description: "Comprehensive guide to mastering JavaScript.",
    tags: ["ebook", "digital", "javascript"],
    price: {
      currency: "USD",
      base: 15,
      cost: 5,
      profit: 10,
      margin: 66,
      discount: { type: "fixed", value: 5 },
      minPrice: 10,
      maxPrice: 15,
    },
    productFormat: "digital",
    digitalAssets: [
      {
        name: "JavaScript Mastery PDF",
        url: "https://example.com/assets/js-mastery.pdf",
        mimeType: "application/pdf",
        accessLimit: 3,
        expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    ],
    status: "active",
    approvalStatus: "approved",
    isAvailable: true,
    ratings: { average: 5, count: 50 },
    isFeatured: false,
    reviews: [],
    productUrl: "https://example.com/products/ebook-javascript",
    publishedAt: new Date(),
    metadata: {
      title: "JavaScript Mastery eBook",
      description: "Learn JavaScript like a pro with this ebook.",
      canonicalUrl: "https://example.com/products/ebook-javascript",
    },
  },
];

// Convert to JSON string for mongosh
const jsonData = JSON.stringify(sampleProducts);

// Use mongosh via child_process
try {
  execSync(
    `echo 'db.${COLLECTION}.insertMany(${jsonData})' | mongosh ${DB_NAME}`,
    { stdio: "inherit" }
  );
  console.log("✅ Products inserted successfully!");
} catch (err) {
  console.error("❌ Error inserting products:", err);
}