import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireAdminApi() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function requireAuthApi() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) return null;
  return user;
}
