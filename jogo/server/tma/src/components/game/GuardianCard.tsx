import { motion } from "framer-motion";
import { cn } from "../ui/cn";
import { Zap, TrendingUp } from "lucide-react";

interface GuardianCardProps {
  name: string;
  rarity: string;
  level: number;
  vePerHour: number;
  csPerHour: number;
  onClick?: () => void;
}

const RARITY_STYLES: Record<string, { bg: string; border: string; glow: string; label: string }> = {
  common: { bg: "bg-slate-800", border: "border-slate-500", glow: "", label: "Common" },
  rare: { bg: "bg-blue-900/50", border: "border-blue-500", glow: "shadow-blue-500/20", label: "Rare" },
  epic: { bg: "bg-purple-900/50", border: "border-purple-500", glow: "shadow-purple-500/30", label: "Epic" },
  legendary: { bg: "bg-amber-900/30", border: "border-amber-500", glow: "shadow-amber-500/40", label: "Legendary" },
};

export function GuardianCard({ name, rarity, level, vePerHour, csPerHour, onClick }: GuardianCardProps) {
  const style = RARITY_STYLES[rarity] || RARITY_STYLES.common;

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "rounded-xl border-2 p-4 cursor-pointer transition-all",
        style.bg, style.border,
        style.glow && `shadow-lg ${style.glow}`
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-sm">{name}</h3>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            rarity === "common" && "bg-slate-600 text-slate-300",
            rarity === "rare" && "bg-blue-600 text-blue-200",
            rarity === "epic" && "bg-purple-600 text-purple-200",
            rarity === "legendary" && "bg-amber-600 text-amber-200"
          )}>
            {style.label}
          </span>
        </div>
        <div className="bg-[#252540] px-2 py-1 rounded-lg text-xs font-mono">
          Lv.{level}
        </div>
      </div>

      {/* Guardian Visual */}
      <div className="h-24 flex items-center justify-center mb-3">
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center text-2xl",
          rarity === "common" && "bg-slate-700",
          rarity === "rare" && "bg-blue-800",
          rarity === "epic" && "bg-purple-800",
          rarity === "legendary" && "bg-amber-800 glow-pulse"
        )}>
          {rarity === "common" && "✨"}
          {rarity === "rare" && "⚡"}
          {rarity === "epic" && "🔮"}
          {rarity === "legendary" && "👑"}
        </div>
      </div>

      <div className="flex gap-3 text-xs">
        <div className="flex items-center gap-1 text-cyan-400">
          <Zap size={12} />
          <span>{vePerHour.toFixed(2)} VE/h</span>
        </div>
        <div className="flex items-center gap-1 text-purple-400">
          <TrendingUp size={12} />
          <span>{csPerHour} CS/h</span>
        </div>
      </div>
    </motion.div>
  );
}
