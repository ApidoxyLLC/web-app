
/**
 * 
 * 
 *                  Primary code structure, implement with through check 
 *             ********** ********** ********** ********** ********** **********
 * 
 * 
 */
// export async function POST(request) {
//   const { success, shop, data: user } = await authenticationStatus(request);
//   const fingerprint = request.headers.get('x-fingerprint');

//   const vendor_db = await dbConnect(...);
//   const CartModel = cartModel(vendor_db);

//   const guestCart = await CartModel.findOne({ fingerprint, userId: { $exists: false } });
//   const userCart = await CartModel.findOne({ userId: user._id });

//   if (!guestCart || !userCart) {
//     return NextResponse.json({ error: "Nothing to sync" }, { status: 400 });
//   }

//   // Merge items intelligently
//   guestCart.items.forEach(gItem => {
//     const uItem = userCart.items.find(uItem =>
//       uItem.productId.toString() === gItem.productId.toString() &&
//       (!gItem.variantId || uItem.variantId?.toString() === gItem.variantId?.toString())
//     );
//     if (uItem) {
//       uItem.quantity += gItem.quantity;
//       uItem.subtotal += gItem.subtotal;
//     } else {
//       userCart.items.push(gItem);
//     }
//   });

//   await userCart.save();
//   await guestCart.deleteOne();

//   return NextResponse.json({ success: true, message: "Cart synced" });
// }