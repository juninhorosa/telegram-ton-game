import { Zap, Gem } from "lucide-react";

interface ResourceBarProps {
  veBalance: number;
  csBalance: number;
  vePerHour: number;
  csPerHour: number;
}

export function ResourceBar({ veBalance, csBalance, vePerHour, csPerHour }: ResourceBarProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-[#1a1a2e] rounded-xl p-3 border border-cyan-500/20">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={14} className="text-cyan-400" />
          <span className="text-xs text-gray-400">Void Energy</span>
        </div>
        <div className="text-lg font-bold text-cyan-400">{veBalance.toFixed(2)}</div>
        <div className="text-xs text-gray-500">+{vePerHour.toFixed(2)}/hr</div>
      </div>

      <div className="bg-[#1a1a2e] rounded-xl p-3 border border-purple-500/20">
        <div className="flex items-center gap-2 mb-1">
          <Gem size={14} className="text-purple-400" />
          <span className="text-xs text-gray-400">Crystal Shards</span>
        </div>
        <div className="text-lg font-bold text-purple-400">{csBalance.toLocaleString()}</div>
        <div className="text-xs text-gray-500">+{csPerHour}/hr</div>
      </div>
    </div>
  );
}
