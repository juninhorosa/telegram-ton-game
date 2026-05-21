import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ResourceBar } from "../components/game/ResourceBar";
import { CollectButton } from "../components/game/CollectButton";
import { GuardianCard } from "../components/game/GuardianCard";
import { api } from "../utils/api";
import { usePlayerStore } from "../utils/store";

export function MainPage() {
  const { setPlayer, updateBalances, ...player } = usePlayerStore();
  const [guardians, setGuardians] = useState<any[]>([]);
  const [farmingStatus, setFarmingStatus] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profile, farming, guardiansData] = await Promise.all([
        api.getProfile(),
        api.getFarmingStatus(),
        api.getGuardians(),
      ]);
      setPlayer(profile);
      setFarmingStatus(farming);
      setGuardians(guardiansData);
    } catch (err) {
      console.log("Load failed - using demo mode");
    }
  };

  const handleCollect = async () => {
    const result = await api.collect();
    updateBalances(result.earnedVE, result.earnedCS);
    return result;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-2"
      >
        <h1 className="text-xl font-bold bg-gradient-to-r from-void-400 to-cyber-400 bg-clip-text text-transparent">
          CryptoRealm
        </h1>
        <p className="text-xs text-gray-500">Guardians of the Void</p>
      </motion.div>

      {/* Resources */}
      <ResourceBar
        veBalance={player.veBalance}
        csBalance={player.csBalance}
        vePerHour={player.totalVEPerHour}
        csPerHour={player.totalCSPerHour}
      />

      {/* Pending Resources */}
      {farmingStatus && farmingStatus.pendingVE > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-[#1a1a2e] rounded-xl p-3 border border-void-500/30 text-center"
        >
          <p className="text-xs text-gray-400 mb-1">Pending Collection</p>
          <p className="text-cyan-400 font-mono">{farmingStatus.pendingVE.toFixed(2)} VE</p>
          <p className="text-purple-400 font-mono text-sm">{farmingStatus.pendingCS} CS</p>
        </motion.div>
      )}

      {/* Collect Button */}
      <div className="flex justify-center py-4">
        <CollectButton onCollect={handleCollect} />
      </div>

      {/* Active Guardians Preview */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 mb-3">Active Guardians ({guardians.length})</h2>
        <div className="grid grid-cols-2 gap-3">
          {guardians.slice(0, 4).map((g) => (
            <GuardianCard
              key={g.id}
              name={g.name}
              rarity={g.rarity}
              level={g.level}
              vePerHour={g.vePerHour}
              csPerHour={g.csPerHour}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
