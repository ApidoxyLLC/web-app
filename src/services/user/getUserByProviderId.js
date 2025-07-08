import { userModel } from "@/models/auth/User";

async function getUserByProviderId({ db,  provider, providerId}) {
    if (!['google', 'facebook'].includes(provider)) 
        throw new Error('Invalid provider. Must be "google" or "facebook"');

    const providerPath = `oauth.${provider}.sub`;
    const User =  userModel(db);
    return await User.findOne({ [providerPath]: providerId, isDeleted: false });
}

export default getUserByProviderId;