import { serialize } from "cookie";

export function getCleanCookies() {
    const cookieNames = [
    "next-auth.session-token",
    "next-auth.csrf-token",
    "next-auth.callback-url",
  ];

  return cookieNames.map((cookieName) =>
    serialize(cookieName, "", {
      path: "/",
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    })
  );
}
export default getCleanCookies;