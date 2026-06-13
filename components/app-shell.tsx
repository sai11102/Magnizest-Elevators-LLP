"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LayoutDashboard, Users, Building2, Wrench, Bell, Search, LogOut, Settings, ShieldCheck, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/sites", label: "Sites", icon: Building2 },
  { href: "/services", label: "Services", icon: Wrench },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/search", label: "Search", icon: Search },
  { href: "/about", label: "About", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate: (href: string) => void }) {
  const { signOut, user } = useAuth();

  return (
    <div className="flex h-full flex-col bg-slate-950/95 text-slate-100">
      <div className="border-b border-white/10 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-sky-500/15 text-sky-300 shadow-lg shadow-sky-500/10">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white">Magnizest</p>
            <p className="text-xs text-slate-400">Elevators LLP</p>
          </div>
        </div>
        <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/75 p-4 text-xs text-slate-400">
          <p className="font-medium text-slate-200">AMC Management System</p>
          <p className="mt-1">Modern service tracking, contract alerts, and customer support.</p>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => onNavigate(item.href)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sky-500/15 text-sky-300 shadow-sm"
                    : "text-slate-300 hover:bg-slate-900/70 hover:text-white"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-sky-300")} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 truncate text-xs text-slate-400">{user?.email ?? "admin@magnizest.com"}</div>
        <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={signOut}>
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const navigate = (href: string) => {
    router.push(href);
    setMobileOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-slate-950/95 lg:block">
        <SidebarContent pathname={pathname} onNavigate={navigate} />
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-3 border-b border-white/10 bg-slate-950/95 px-4 lg:hidden">
          <Sheet direction="left" open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SidebarContent pathname={pathname} onNavigate={navigate} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold text-white">Magnizest</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
