import { userModel } from "@/models/auth/User";
import authDbConnect from "@/lib/mongodb/authDbConnect";

export async function getUserByIdentifier({ auth_db, payload, fields=[] }) {
    
    if (!payload || typeof payload !== "object" || Array.isArray(payload) || payload === null) 
        throw new Error("Invalid data format: expected an object");
    
    const { email, phone, username } = payload;
    if (!email && !phone && !username)
        throw new Error("At least one identifier (email, phone or username) is required.");

    const query = { $or: [] };
    if (email)    query.$or.push({    email: email.trim() });    
    if (phone)    query.$or.push({    phone: phone.trim() });
    if (username) query.$or.push({ username: username.trim() });

    try {
        // const   db = await authDbConnect();
        const User = userModel(auth_db);
        const selectFields = [ '+_id', 
                               '+referenceId',
                               ...fields
                            ].join(' ');

        return await User.findOne(query)
                         .select(selectFields)
                         .lean().exec();
    } catch (error) {
        console.log(error)
        throw new Error("something went wrong...");
    }
}

export default getUserByIdentifier;