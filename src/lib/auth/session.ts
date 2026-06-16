import { auth } from "@/auth";
import { redirect } from "next/navigation";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  clientId: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    role: session.user.role,
    clientId: session.user.clientId,
  };
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role === "CLIENT") redirect("/portal");
  return user;
}

export async function requireClient(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== "CLIENT" || !user.clientId) redirect("/");
  return user;
}

export async function requireStaff(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role === "CLIENT") redirect("/portal");
  return user;
}
