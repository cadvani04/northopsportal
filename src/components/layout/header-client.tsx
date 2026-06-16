"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn, formatRelative, getInitials } from "@/lib/utils";
import { searchAll, markNotificationRead, markAllNotificationsRead } from "@/lib/actions";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  createdAt: Date;
}

interface HeaderClientProps {
  userName: string;
  userRole: string;
  unreadCount: number;
  notifications: Notification[];
}

export function HeaderClient({
  userName,
  userRole,
  unreadCount,
  notifications,
}: HeaderClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchAll>> | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [pending, startTransition] = useTransition();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        const r = await searchAll(query);
        setResults(r);
        setShowSearch(true);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#0c0f14]/80 px-8 backdrop-blur-md">
      <div />

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results && setShowSearch(true)}
            placeholder="Search tasks, clients, invoices..."
            className="w-72 rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          />
          {showSearch && results && (
            <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-xl border border-white/10 bg-[#0c0f14] p-2 shadow-xl">
              {results.tasks.length === 0 &&
                results.clients.length === 0 &&
                results.invoices.length === 0 && (
                  <p className="px-3 py-4 text-sm text-slate-500">No results</p>
                )}
              {results.tasks.map((t) => (
                <Link
                  key={t.id}
                  href="/tasks"
                  onClick={() => setShowSearch(false)}
                  className="block rounded-lg px-3 py-2 text-sm hover:bg-white/5"
                >
                  <span className="text-white">{t.title}</span>
                  <span className="ml-2 text-xs text-slate-500">Task</span>
                </Link>
              ))}
              {results.clients.map((c) => (
                <Link
                  key={c.id}
                  href="/clients"
                  onClick={() => setShowSearch(false)}
                  className="block rounded-lg px-3 py-2 text-sm hover:bg-white/5"
                >
                  <span className="text-white">{c.company}</span>
                  <span className="ml-2 text-xs text-slate-500">Client</span>
                </Link>
              ))}
              {results.invoices.map((i) => (
                <Link
                  key={i.id}
                  href="/invoices"
                  onClick={() => setShowSearch(false)}
                  className="block rounded-lg px-3 py-2 text-sm hover:bg-white/5"
                >
                  <span className="text-white">{i.number}</span>
                  <span className="ml-2 text-xs text-slate-500">Invoice</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400 text-[10px] font-bold text-black">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-white/10 bg-[#0c0f14] shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <span className="text-sm font-medium text-white">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={() =>
                      startTransition(async () => {
                        await markAllNotificationsRead();
                        router.refresh();
                      })
                    }
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() =>
                        startTransition(async () => {
                          await markNotificationRead(n.id);
                          setShowNotifs(false);
                          if (n.link) router.push(n.link);
                          router.refresh();
                        })
                      }
                      className={cn(
                        "block w-full border-b border-white/5 px-4 py-3 text-left hover:bg-white/5",
                        !n.read && "bg-cyan-500/5"
                      )}
                    >
                      <p className="text-sm font-medium text-white">{n.title}</p>
                      {n.message && <p className="text-xs text-slate-400">{n.message}</p>}
                      <p className="mt-1 text-xs text-slate-600">{formatRelative(n.createdAt)}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-white">{userName}</p>
            <p className="text-xs capitalize text-slate-500">{userRole.toLowerCase()}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-semibold text-white">
            {getInitials(userName)}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
