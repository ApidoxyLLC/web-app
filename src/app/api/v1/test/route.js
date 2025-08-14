import { NextResponse } from "next/server"
import { getInfrastructure } from "@/services/vendor/getInfrastructure"
import { getVendor } from "@/services/vendor/getVendor";

export async function POST(request) {
    try {
        console.log(request)
        const result = await getInfrastructure({ host : "6876024036840edac6817ee3.appcommerz.com" })
            // const result = await getVendor({ 
            //                     // id: "cmd47izhv0000dsllvbixo5wn", 
            //                     host: "687602403__6840edac6817ee3.appcommerz.com",
            //                     fields: ['createdAt', 'primaryDomain']    });
        
        console.log(result)
        return NextResponse.json( { success: true, message: "sample response" }, { status: 200 });
    } catch (error) {
        console.log(error)
        return NextResponse.json( { success: false, message: "Error" }, { status: 400 });
    }
    
}
