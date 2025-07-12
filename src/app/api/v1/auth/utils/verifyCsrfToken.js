
import { cookies } from 'next/headers';
export async function verifyCsrfToken(req) {
  const csrfHeader = req.headers.get("x-csrf-token");
  const cookieStore = await cookies()
  const csrfCookie = cookieStore.get("next-auth.csrf-token")?.value;
  if (!csrfHeader || !csrfCookie) return false;
  const [storedToken] = csrfCookie.split("|"); // Cookie format: token|hash
  return csrfHeader === storedToken;
}
export default verifyCsrfToken;