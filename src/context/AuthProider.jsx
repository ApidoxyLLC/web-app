"use client";
import { SessionProvider } from "next-auth/react";

const NEXTAUTH_URL_INTERNAL = process.env.NEXTAUTH_URL_INTERNAL || "http://localhost:3000/api/v1/auth"

export default function AuthProider(props) {
    const { children, pageProps } = props
    

    return (
      <>
        <SessionProvider  basePath={NEXTAUTH_URL_INTERNAL}>
          {children}
        </SessionProvider>
      </>
        
      )
}
