"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import Form from 'next/form'
import useFingerprint from "@/hooks/useFingerprint";

export default function page() {
    const fingerprint = useFingerprint()
    console.log(fingerprint)

     async function createUser(formData) {
        const email = formData.get("email")?.toString() ?? "";
        const password = formData.get("password")?.toString() ?? "";
        const result = await signIn('login', {
                          identifier: email,
                            password: password,
                         fingerprint: fingerprint?.fingerprintId || '',
                           userAgent: fingerprint?.userAgent     || '',
                            timezone: fingerprint?.timezone      || '',
                    });

        console.log(result)

            // if (result?.error) {
            //     // Handle error
            // } else {
            //     // Redirect to a protected route
            // }
        }


        async function requestToCreateProduct() {
            try {
                const response = await fetch('/api/v1/shops', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: 'Sample data'}),
                });

                if (!response.ok) {
                throw new Error('Network response was not ok');
                }

                const data = await response.json();
                console.log('Got Data', data);
            } catch (error) {
                console.error('Error:', error);
            }
        }

    return (<Form action={createUser}>
                    <input name="email" placeholder="Email..."/><br/>
                    <input name="password" placeholder="Password..."/><br/>
                
                <button className="border" type="submit">Submit</button>
                <button onClick={()=>signOut()}  className="border" >Logout</button>

                <button onClick={()=>requestToCreateProduct()}  className="border" >Create Shop</button>
            </Form> )
}


//   const { data: session } = useSession();
//   console.log(session);
//   if (session) {
//         return (
//             <>
//                 signed in as    / {session.user.email} <br/>
//                 <button onClick={()=>signOut()}>Sign out</button>
//             </>
//         )
//     } else {
//         return (
//             <>
//                 {/* signed in as <br/>
//                 <button onClick={()=>signIn('credentials', {
//                                                 redirect: false,
//                                                 identifier: "sample",
//                                                 password: "password",
//                                                 })}>Sign in</button> */}


                                                           
//             </>
//           )
//     }
