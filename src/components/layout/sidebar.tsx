"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Package,
  FileText,
  Receipt,
  DollarSign,
  Calendar,
  Users,
  Video,
  Activity,
  Building2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

const adminNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/deliverables", label: "Deliverables", icon: Package },
  { href: "/agreements", label: "Agreements", icon: FileText },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/expenses", label: "Expenses", icon: DollarSign },
  { href: "/timeline", label: "Timeline", icon: Calendar },
  { href: "/meetings", label: "Meetings", icon: Video },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/activity", label: "Activity", icon: Activity },
];

const clientNav = [
  { href: "/portal", label: "Overview", icon: LayoutDashboard },
  { href: "/portal/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/portal/deliverables", label: "Deliverables", icon: Package },
  { href: "/portal/agreements", label: "Agreements", icon: FileText },
  { href: "/portal/invoices", label: "Invoices", icon: Receipt },
  { href: "/portal/meetings", label: "Meetings", icon: Video },
];

interface SidebarProps {
  mode?: "admin" | "client";
}

export function Sidebar({ mode = "admin" }: SidebarProps) {
  const pathname = usePathname();
  const nav = mode === "client" ? clientNav : adminNav;

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-[#0c0f14]">
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <Logo
          size="md"
          showText
          subtitle={mode === "client" ? "Client Portal" : "Operations Hub"}
        />
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {nav.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        {mode === "admin" ? (
          <Link
            href="/portal"
            className="flex items-center justify-between rounded-lg bg-cyan-500/10 px-3 py-2.5 text-sm font-medium text-cyan-400 transition-colors hover:bg-cyan-500/20"
          >
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Client Portal
            </span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link
            href="/"
            className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Admin Dashboard
            </span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </aside>
  );
}
