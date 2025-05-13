import NextAuth from "next-auth";
import { authOptions } from "./option";

const handlar = NextAuth(authOptions);
export { handlar as GET, handlar as POST };
