import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GuardianCard } from "../components/game/GuardianCard";
import { api } from "../utils/api";
import { cn } from "../components/ui/cn";
import { Plus, ArrowUp, Merge } from "lucide-react";

export function GuardiansPage() {
  const [guardians, setGuardians] = useState<any[]>([]);
  const [showShop, setShowShop] = useState(false);
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null);

  useEffect(() => { api.getGuardians().then(setGuardians).catch(() => {}); }, []);

  const handleBuy = async (rarity: string, payWith: "ton" | "ve") => {
    const result = await api.buyGuardian(rarity, payWith);
    if (!result.error) {
      setGuardians((prev) => [...prev, result]);
      setShowShop(false);
    }
  };

  const handleUpgrade = async (id: string) => {
    const result = await api.upgradeGuardian(id);
    if (!result.error) {
      setGuardians((prev) => prev.map((g) => g.id === id ? result : g));
    }
  };

  const handleFuse = async (rarity: string) => {
    const result = await api.fuseGuardians(rarity);
    if (!result.error) {
      setGuardians((prev) => [...prev.filter((g) => g.rarity !== rarity || !g.isActive).slice(0, -3), result]);
    }
  };

  const shopItems = [
    { rarity: "common", name: "Aether Sprite", price: "0.5 TON / 100 VE", icon: "✨" },
    { rarity: "rare", name: "Storm Sentinel", price: "2.0 TON / 400 VE", icon: "⚡" },
    { rarity: "epic", name: "Void Titan", price: "7.5 TON / 1500 VE", icon: "🔮" },
    { rarity: "legendary", name: "Cosmic Leviathan", price: "25 TON / 5000 VE", icon: "👑" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-bold">Guardians</h1>
        <button
          onClick={() => setShowShop(!showShop)}
          className="bg-void-500 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
        >
          <Plus size={14} /> Shop
        </button>
      </div>

      {/* Shop */}
      <AnimatePresence>
        {showShop && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#1a1a2e] rounded-xl p-4 border border-void-500/30 space-y-3">
              <h3 className="text-sm font-semibold">Buy Guardian</h3>
              {shopItems.map((item) => (
                <div key={item.rarity} className="flex items-center justify-between p-3 bg-[#252540] rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.price}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBuy(item.rarity, "ton")}
                      className="bg-cyan-600 px-2 py-1 rounded text-xs"
                    >
                      TON
                    </button>
                    <button
                      onClick={() => handleBuy(item.rarity, "ve")}
                      className="bg-purple-600 px-2 py-1 rounded text-xs"
                    >
                      VE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fuse Section */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-purple-500/20">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Merge size={14} /> Fusion (3x same rarity → 1x higher)
        </h3>
        <div className="flex gap-2">
          {["common", "rare", "epic"].map((r) => {
            const count = guardians.filter((g) => g.rarity === r && g.isActive).length;
            return (
              <button
                key={r}
                onClick={() => handleFuse(r)}
                disabled={count < 3}
                className={cn(
                  "px-3 py-2 rounded-lg text-xs flex-1",
                  count >= 3 ? "bg-purple-600" : "bg-[#252540] opacity-50"
                )}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)} ({count}/3)
              </button>
            );
          })}
        </div>
      </div>

      {/* Guardian List */}
      <div className="grid grid-cols-2 gap-3">
        {guardians.filter((g) => g.isActive).map((g) => (
          <div key={g.id} className="relative">
            <GuardianCard
              name={g.name}
              rarity={g.rarity}
              level={g.level}
              vePerHour={g.vePerHour}
              csPerHour={g.csPerHour}
            />
            {g.level < 10 && (
              <button
                onClick={() => handleUpgrade(g.id)}
                className="absolute top-2 right-2 bg-void-600 p-1.5 rounded-lg"
              >
                <ArrowUp size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      {guardians.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          <p className="text-3xl mb-2">🛡️</p>
          <p>No guardians yet. Visit the shop!</p>
        </div>
      )}
    </div>
  );
}
