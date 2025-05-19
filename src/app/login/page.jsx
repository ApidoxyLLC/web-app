"use client";
// import { useSession, signIn, signOut } from "next-auth/react";
import Form from 'next/form'

export default function page() {
     async function createUser(formData) {


            console.log(formData)
        }

    return (<Form action={createUser}>
                    <input name="email" placeholder="Email..."/><br/>
                    <input name="password" placeholder="Password..."/><br/>
                <button className="border" type="submit">Submit</button>
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
