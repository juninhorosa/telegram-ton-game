import { useLocation, useNavigate } from "react-router-dom";
import { Home, Shield, Users, ArrowDownToLine, User, Settings } from "lucide-react";
import { cn } from "../ui/cn";
import { usePlayerStore } from "../../utils/store";

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = usePlayerStore();

  const nav = [
    { path: "/", icon: Home, label: "Farm" },
    { path: "/guardians", icon: Shield, label: "Guardians" },
    { path: "/referrals", icon: Users, label: "Refs" },
    { path: "/withdraw", icon: ArrowDownToLine, label: "Withdraw" },
    { path: "/profile", icon: User, label: "Profile" },
    ...(isAdmin ? [{ path: "/admin", icon: Settings, label: "Admin" }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1a1a2e] border-t border-[#2a2a4a] px-2 py-2 flex justify-around">
      {nav.map(({ path, icon: Icon, label }) => {
        const active = location.pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors",
              active ? "text-void-400" : "text-gray-500"
            )}
          >
            <Icon size={20} />
            <span className="text-xs">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
