import { Sidebar } from "./sidebar";
import { HeaderClient } from "./header-client";
import { getSessionUser } from "@/lib/auth/session";
import { isIntern } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

interface AppShellProps {
  children: React.ReactNode;
  mode?: "admin" | "client" | "intern";
}

export async function AppShell({ children, mode }: AppShellProps) {
  const user = await getSessionUser();
  const shellMode =
    mode ?? (user?.role === "CLIENT" ? "client" : isIntern(user?.role ?? "") ? "intern" : "admin");
  const notifications = user
    ? await db.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex h-screen overflow-hidden bg-[#080b10]">
      <Sidebar mode={shellMode} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {user && (
          <HeaderClient
            userName={user.name}
            userRole={user.role}
            unreadCount={unreadCount}
            notifications={notifications}
          />
        )}
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
