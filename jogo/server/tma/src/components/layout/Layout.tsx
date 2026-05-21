import { BottomNav } from "./BottomNav";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20">
      <main className="px-4 py-4 max-w-lg mx-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
