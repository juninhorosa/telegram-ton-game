"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ArrowDownToLine, Users, Coins,
  ShieldAlert, Vault, Settings, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME, NAV_ITEMS, ROLE_PERMISSIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const ICONS: Record<string, React.ElementType> = {
  LayoutDashboard, ArrowDownToLine, Users, Coins,
  ShieldAlert, Vault, Settings,
};

interface AppSidebarProps {
  userRole: string;
}

export function AppSidebar({ userRole }: AppSidebarProps) {
  const pathname = usePathname();
  const permissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] ?? ROLE_PERMISSIONS.viewer;

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center px-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-void-500 flex items-center justify-center text-white font-bold text-sm">CR</div>
          <div>
            <div className="text-sm font-semibold text-sidebar-foreground">{APP_NAME}</div>
            <div className="text-xs text-muted-foreground">Guardians of the Void</div>
          </div>
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            if (!permissions.screens.includes(item.screen)) return null;
            const Icon = ICONS[item.icon] ?? LayoutDashboard;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn("w-full justify-start gap-3", isActive && "bg-sidebar-accent")}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <Separator />
      <div className="p-2">
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={() => window.location.href = "/api/auth/signout"}>
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
