/**
 * 
 * 
 *                  Primary code structure, implement with through check 
 *             ********** ********** ********** ********** ********** **********
 * 
 * 
 */
// export async function GET(request) {
//   const { success, shop, data: user } = await authenticationStatus(request);
//   const fingerprint = request.headers.get('x-fingerprint');

//   const vendor_db = await dbConnect(...);
//   const CartModel = cartModel(vendor_db);

//   const guestCart = await CartModel.findOne({ fingerprint, userId: { $exists: false } });
//   const userCart = success && user ? await CartModel.findOne({ userId: user._id }) : null;

//   const needsSync = !!guestCart && !!userCart;

//   return NextResponse.json({ hasGuestCart: !!guestCart, hasUserCart: !!userCart, needsSync });
// }