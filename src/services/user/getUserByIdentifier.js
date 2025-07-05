import { userModel } from "@/models/auth/User";
import authDbConnect from "@/lib/mongodb/authDbConnect";

export async function getUserByIdentifier({ identifiers, fields=[] }) {
    if (!identifiers || typeof identifiers !== "object" || Array.isArray(identifiers) || identifiers === null) 
        throw new Error("Invalid data format: expected an object");
    
    const { email, phone, username } = identifiers;
    if (!email && !phone && !username)
        throw new Error("At least one identifier (email, phone or username) is required.");

    const query = { $or: [] };
    if (email)    query.$or.push({    email: email.trim() });    
    if (phone)    query.$or.push({    phone: phone.trim() });
    if (username) query.$or.push({ username: username.trim() });
         
    try {
        const   db = await authDbConnect();
        const User = userModel(db);

        // const selectFields = [ '+_id', 
        //                        '+referenceId',
        //                        ...(fields.includes('security') ? [ '+security.password',
        //                                                            '+security.failedAttempts'   ] : []),

        //                        ...(fields.includes('lock') ? [ '+lock.isLocked',
        //                                                        '+lock.lockReason',
        //                                                        '+lock.lockUntil'    ] : []),
        //                        ...(fields.includes('verification') ? [ '+verification',
        //                                                                '+isEmailVerified',
        //                                                                '+isPhoneVerified'  ] : []),
        //                         ...fields.filter(field => field && !['security', 'lock', 'verification'].includes(field))
        //                     ].join(' '); 

        const selectFields = [ '+_id', 
                               '+referenceId',
                               ...fields
                            ].join(' ');
        return await User.findOne(query) 
                                    .select(fields.join(' '))
                                    .lean()
                                    .exec()
    } catch (error) {
        console.log(error)
        throw new Error("something went wrong...");
    }
}

export default getUserByIdentifier;



        // const selectFields = [  '+_id',
        //                         '+security',
        //                         '+security.password',
        //                         '+security.failedAttempts',
        //                         '+lock',
        //                         '+lock.isLocked',
        //                         '+lock.lockReason',
        //                         '+lock.lockUntil',
        //                         '+verification',
        //                         '+isEmailVerified',
        //                         '+isPhoneVerified',
        //                         '+role', ...fields.filter(Boolean) ].join(' ');