import { subscriptionPlanModel } from "@/models/subscription/Plan";

export async function createSubscriptionPlan({ db, session, data }) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format');
    }
    const Plan = subscriptionPlanModel(db)
    const document = new Plan(data);
    if (session){
      await document.save({ session }); 
    }else{
      await document.save();
    }
    return document;
}