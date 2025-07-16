import authDbConnect from "@/lib/mongodb/authDbConnect";
import { subscriptionModel } from "@/models/subscription/Subscription";
import { userModel } from "@/models/auth/User";
import config from "../../../config";
import bcrypt from "bcryptjs";
import crypto from 'crypto';

export async function createUser({ session, payload }) {
  if (!payload || typeof payload !== "object")
    throw new Error("Invalid data format");

  const { name, email, phone, password } = payload || {};
  const db = authDbConnect()
  const User = userModel(db);
  // const subscriptionPlan = subscriptionModel(db);
  const salt = await bcrypt.genSalt(14);
  const hashedPassword = password ? await bcrypt.hash(password, salt) : undefined;
  const token = crypto.randomBytes(32).toString("hex");
  const otp = crypto.randomInt(100000, 999999).toString();


  // const plan = await subscriptionPlan.findOne({ planSlug: "free-starter", isActive: true }).lean();
  // console.log("*************************console plan*************************")
  // console.log(plan)
  // if (!plan) throw new Error("Free Starter plan not found");

  // const trialDays = plan.trial?.days || 0;
  // const now = new Date();
  // const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);


  // const subscriptionScope = {
  //                       customDomains: plan.limits?.customDomains,
  //                          subDomains: plan.limits?.subDomains,
  //                               shops: plan.limits?.shops,
                                
  //   androidApp: plan.limits?.apps?.android,
  //   webApp: plan.limits?.apps?.web,
  //   iosApp: plan.limits?.apps?.ios,
  //   androidBuild: plan.limits?.builds?.android,
  //   webBuild: plan.limits?.builds?.web,
  //   iosBuild: plan.limits?.builds?.ios,
  //   paymentIntegrations: plan.limits?.paymentIntegrations,
  //   deliveryIntegrations: plan.limits?.deliveryIntegrations,
  //   smsGateways: plan.limits?.smsGateways,
  //   monthlyNotifications: plan.limits?.monthlyNotifications,
  //   storageMB: plan.limits?.storageMB,
  //   customerAccounts: plan.limits?.customerAccounts,
  //   staffUsers: plan.limits?.staffUsers,
  //   products: plan.limits?.products,
  //   monthlyOrders: plan.limits?.monthlyOrders,
  //   features: {
  //     analyticsDashboard: plan.features?.analyticsDashboard,
  //     inventoryManagement: plan.features?.inventoryManagement,
  //     customerSupport: plan.features?.customerSupport,
  //     socialLogin: plan.features?.socialLogin,
  //   },
  //   trial: {
  //     startAt: now,
  //     endAt: trialEnd,
  //     days: trialDays,
  //   },
  //   billingCycle: plan.billingCycle,
  //   currency: plan.prices.currency,
  //   isActive: true,
  //   startedAt: now,
  //   renewedAt: null,
  //   expiresAt: trialEnd,
  //   planId: plan.planId || plan._id,
  //   planName: plan.planName,
  //   planSlug: plan.planSlug,
  //   tier: plan.tier,
  // };


  const userInfo = {
    name,
    security: { ...(password && { password: hashedPassword, salt }) },
    verification: {
      ...(email && {
        emailVerificationToken: crypto.createHash("sha256").update(token).digest("hex"),
        emailVerificationTokenExpiry: new Date(Date.now() + config.emailVerificationExpireMinutes * 60 * 1000).getTime()
      }),
      ...(phone && !email && {
        phoneVerificationOTP: crypto.createHash("sha256").update(otp).digest("hex"),
        phoneVerificationOTPExpiry: new Date(Date.now() + config.phoneVerificationExpireMinutes * 60 * 1000).getTime()
      }),
    },
    ...(email && { email }),
    ...(phone && { phone }),
    // subscriptionScope,
    // tier: plan.tier,
  };

  const query = new User(userInfo);
  const user = await query.save(session ? { session } : {});
  if (user) {
    if (email) {
      const result = await sendEmail({
        receiverEmail: email,
        emailType: "VERIFY",
        senderEmail: "no-reply@apidoxy.com",
        token
      });

      console.log("Email sent successfully:", result.messageId);
    }
    if (phone && !email) {
      const message = `Your Apidoxy verification code is: ${otp}. Expire in ${config.phoneVerificationExpireMinutes} minutes.`;
      const result = await sendSMS({ phone: phone, message });
      console.log("OTP sent successfully:");
      console.log(result)
    }
    return user;
  }
  throw new Error("User creation failed...")
}

export default createUser;