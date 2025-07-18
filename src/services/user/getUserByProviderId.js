import { userModel } from "@/models/auth/User";
import authDbConnect from "@/lib/mongodb/authDbConnect";

async function getUserByProviderId({ provider, providerId}) {
    if (!['google', 'facebook'].includes(provider)) 
        throw new Error('Invalid provider. Must be "google" or "facebook"');

    const db = await authDbConnect();
    const providerPath = `oauth.${provider}.id`;
    const User =  userModel(db);
    return await User.findOne({ [providerPath]: providerId, isDeleted: false });
}

export default getUserByProviderId;