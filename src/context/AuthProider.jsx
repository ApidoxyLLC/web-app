"use client";
import { SessionProvider } from "next-auth/react";

export default function AuthProider(props) {
    console.log(props)
    const { children, pageProps } = props
    return (
        <SessionProvider  basePath={`/api/${process.env.NEXT_PUBLIC_API_VERSION}/auth`}>
          {children}
        </SessionProvider>
      )
}
