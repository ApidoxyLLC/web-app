"use client";
import { useSession, signIn, signOut } from "next-auth/react";

export default function page() {

  const { data: session } = useSession();
  console.log(session);
  if (session) {
        return (
            <>
                signed in as    / {session.user.email} <br/>
                <button onClick={()=>signOut()}>Sign out</button>
            </>
        )
    } else {
        return (
            <>
                signed in as <br/>
                <button onClick={()=>signIn('credentials', {
                                                redirect: false,
                                                identifier: "sample",
                                                password: "password",
                                                })}>Sign in</button>
            </>
          )
    }

}
