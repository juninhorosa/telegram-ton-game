import { BottomNav } from "./BottomNav";
import { usePlayerStore } from "../../utils/store";

export function Layout({ children }: { children: React.ReactNode }) {
  const player = usePlayerStore();
  const ve = player.veBalance || 0;
  const rate = player.economy?.veToTonRate || 0;
  const ton = rate > 0 ? ve * rate : 0;

  return (
    <div className="min-h-screen pb-20 pt-16">
      <header className="fixed top-0 left-0 right-0 bg-[#0a0a0f]/90 backdrop-blur border-b border-[#2a2a4a] z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{player.username || "Player"}</div>
            <div className="text-[11px] text-gray-400">Level {player.level || 1}</div>
          </div>
          <div className="flex gap-2">
            <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg px-3 py-1.5 text-right">
              <div className="text-[10px] text-gray-400">VE</div>
              <div className="text-xs font-mono text-cyan-300">{ve.toFixed(2)}</div>
            </div>
            <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg px-3 py-1.5 text-right">
              <div className="text-[10px] text-gray-400">TON</div>
              <div className="text-xs font-mono text-amber-200">{ton.toFixed(6)}</div>
            </div>
          </div>
        </div>
      </header>
      <main className="px-4 py-4 max-w-lg mx-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
