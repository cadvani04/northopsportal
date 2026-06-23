import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  canLogOutreach,
  canViewRevenue,
  isClient,
  isIntern,
} from "@/lib/auth/permissions";

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

/** Full internal staff (admin + team). Blocks clients and interns. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (isClient(user.role)) redirect("/portal");
  if (isIntern(user.role)) redirect("/sales/outreach");
  return user;
}

export async function requireClient(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== "CLIENT" || !user.clientId) redirect("/");
  return user;
}

/** Same as requireAdmin — full staff only. */
export async function requireStaff(): Promise<SessionUser> {
  return requireAdmin();
}

/** Outreach logging for staff and sales interns. */
export async function requireOutreachAccess(): Promise<SessionUser> {
  const user = await requireAuth();
  if (!canLogOutreach(user.role)) {
    if (isClient(user.role)) redirect("/portal");
    redirect("/login");
  }
  return user;
}

/** Pages with revenue, pipeline value, invoices, etc. */
export async function requireRevenueAccess(): Promise<SessionUser> {
  const user = await requireAuth();
  if (!canViewRevenue(user.role)) {
    if (isIntern(user.role)) redirect("/sales/outreach");
    if (isClient(user.role)) redirect("/portal");
    redirect("/login");
  }
  return user;
}
