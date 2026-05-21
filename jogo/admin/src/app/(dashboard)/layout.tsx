"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-void-500" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const userRole = (session?.user as { role?: string })?.role ?? "viewer";
  const userName = session?.user?.name ?? "Admin";

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar userRole={userRole} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar userName={userName} userRole={userRole} pendingAlerts={3} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
