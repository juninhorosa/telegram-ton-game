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
  const [error, setError] = useState("");
  const [adOpen, setAdOpen] = useState(false);
  const [adCountdown, setAdCountdown] = useState(0);
  const [adError, setAdError] = useState("");
  const [adBusy, setAdBusy] = useState(false);

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
      setError("");
    } catch (err) {
      setError("Falha ao carregar dados. Tente reabrir pelo Telegram.");
    }
  };

  useEffect(() => {
    if (!adOpen) return;
    if (adCountdown <= 0) return;
    const t = setInterval(() => setAdCountdown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [adOpen, adCountdown]);

  const normalizeScriptSrc = (src: string) => {
    const s = src.trim();
    if (s.startsWith("//")) return `https:${s}`;
    return s;
  };

  const ensureScriptLoaded = async (src: string, attrs?: Record<string, string>) => {
    const normalized = normalizeScriptSrc(src);
    const existing = document.querySelector(`script[data-alpha-src="${normalized}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (attrs) {
        for (const [k, v] of Object.entries(attrs)) {
          existing.setAttribute(k, v);
        }
      }
      if ((existing as any)._alphaLoaded) return;
      await new Promise<void>((resolve, reject) => {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("script_load_failed")));
      });
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = normalized;
      s.async = true;
      s.defer = true;
      s.setAttribute("data-alpha-src", normalized);
      if (attrs) {
        for (const [k, v] of Object.entries(attrs)) {
          s.setAttribute(k, v);
        }
      }
      s.onload = () => {
        (s as any)._alphaLoaded = true;
        resolve();
      };
      s.onerror = () => reject(new Error("script_load_failed"));
      document.head.appendChild(s);
    });
  };

  const showMoneytagAndWait = async (maxWaitMs = 12000) => {
    const cfg = player.publicConfig;
    const scriptSrc = cfg?.moneytagScriptSrc || "";
    const fnName = cfg?.moneytagShowFn || "";
    const payloadRaw = cfg?.moneytagShowPayload || "";
    const zone = cfg?.moneytagZone || "";
    if (!scriptSrc || !fnName) return false;

    try {
      const attrs: Record<string, string> = {};
      if (zone) attrs["data-zone"] = zone;
      attrs["data-sdk"] = fnName;
      await ensureScriptLoaded(scriptSrc, attrs);
    } catch {
      return false;
    }

    const fn = (window as any)[fnName];
    if (typeof fn !== "function") return false;

    let payload: any = undefined;
    if (payloadRaw) {
      try {
        payload = JSON.parse(payloadRaw);
      } catch {
        payload = payloadRaw;
      }
    }

    try {
      const ret = payload !== undefined ? fn(payload) : fn();
      if (ret && typeof ret.then === "function") {
        await ret;
        return true;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, maxWaitMs));
      return true;
    } catch {
      return false;
    }
  };

  const handleCollect = async () => {
    await showMoneytagAndWait(12000);
    const result = await api.collect();
    updateBalances(result.earnedVE, result.earnedCS);
    await loadData();
    return result;
  };

  const tryShowMoneytag = async () => {
    const cfg = player.publicConfig;
    const scriptSrc = cfg?.moneytagScriptSrc || "";
    const fnName = cfg?.moneytagShowFn || "";
    const payloadRaw = cfg?.moneytagShowPayload || "";
    const zone = cfg?.moneytagZone || "";
    if (!scriptSrc || !fnName) return false;

    try {
      const attrs: Record<string, string> = {};
      if (zone) attrs["data-zone"] = zone;
      attrs["data-sdk"] = fnName;
      await ensureScriptLoaded(scriptSrc, attrs);
    } catch {
      return false;
    }

    const fn = (window as any)[fnName];
    if (typeof fn !== "function") return false;

    let payload: any = undefined;
    if (payloadRaw) {
      try {
        payload = JSON.parse(payloadRaw);
      } catch {
        payload = payloadRaw;
      }
    }

    let rewarded = false;
    const rewardOnce = async () => {
      if (rewarded) return;
      rewarded = true;
      const res = await api.claimAdReward();
      if (res?.error) {
        setAdError(String(res.error));
        return;
      }
      await loadData();
    };

    try {
      const ret = payload !== undefined ? fn(payload, rewardOnce) : fn(rewardOnce);
      if (ret && typeof ret.then === "function") {
        await ret.then(rewardOnce);
      } else {
        setTimeout(() => {
          if (!rewarded) rewardOnce().catch(() => {});
        }, 15000);
      }
      return true;
    } catch {
      return false;
    }
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
          ALPHA
        </h1>
        <p className="text-xs text-gray-500">ALPHA</p>
      </motion.div>

      {/* Resources */}
      <ResourceBar
        veBalance={player.veBalance}
        csBalance={player.csBalance}
        vePerHour={player.totalVEPerHour}
        csPerHour={player.totalCSPerHour}
      />

      {player.economy && (
        <div className="text-center text-xs text-gray-500">
          1 VE ≈ {player.economy.veToTonRate.toFixed(6)} TON
        </div>
      )}

      {error && (
        <div className="bg-[#1a1a2e] rounded-xl p-3 border border-red-500/30 text-center">
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

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

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={async () => {
            setAdError("");
            setAdBusy(true);
            try {
              const usedMoneytag = await tryShowMoneytag();
              if (usedMoneytag) return;

              const adLink = player.publicConfig?.adLink || "";
              if (adLink) {
                setAdOpen(true);
                setAdCountdown(Math.max(0, Number(player.publicConfig?.adMinSeconds ?? 8)));
                return;
              }

              const res = await api.claimAdReward();
              if (res?.error) return;
              await loadData();
            } finally {
              setAdBusy(false);
            }
          }}
          disabled={adBusy}
          className="bg-[#1a1a2e] rounded-xl p-3 border border-[#2a2a4a] text-sm disabled:opacity-50"
        >
          {adBusy ? "Abrindo..." : "Assistir anúncio (VE)"}
        </button>
        <button
          onClick={async () => {
            const res = await api.buyBotFarm();
            if (res?.error) return;
            await loadData();
          }}
          className="bg-[#1a1a2e] rounded-xl p-3 border border-[#2a2a4a] text-sm"
        >
          Comprar Bot Farm
        </button>
      </div>

      {adOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
          <div className="h-full w-full max-w-lg mx-auto flex flex-col">
            <div className="px-4 py-3 flex items-center justify-between border-b border-[#2a2a4a] bg-[#0a0a0f]/95">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">ALPHA</div>
                <div className="text-[11px] text-gray-400">ads by Moneytag</div>
              </div>
              <button
                onClick={() => {
                  setAdOpen(false);
                  setAdCountdown(0);
                }}
                className="text-xs text-gray-300 bg-[#1a1a2e] border border-[#2a2a4a] px-3 py-2 rounded-lg"
              >
                Fechar
              </button>
            </div>

            <div className="flex-1 bg-black">
              <iframe
                title="ad"
                src={player.publicConfig?.adLink || "about:blank"}
                className="w-full h-full"
                sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-modals allow-top-navigation-by-user-activation"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="p-4 space-y-2 bg-[#0a0a0f]/95 border-t border-[#2a2a4a]">
              <div className="text-xs text-gray-400 text-center">Clique para receber a recompensa!</div>
              {adError && <div className="text-xs text-red-300 text-center">{adError}</div>}
              <button
                disabled={adCountdown > 0}
                onClick={async () => {
                  try {
                    const res = await api.claimAdReward();
                    if (res?.error) {
                      setAdError(String(res.error));
                      return;
                    }
                    setAdOpen(false);
                    setAdCountdown(0);
                    await loadData();
                  } catch {
                    setAdError("Falha ao receber recompensa.");
                  }
                }}
                className="w-full bg-gradient-to-r from-void-500 to-cyber-500 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {adCountdown > 0 ? `Continuar (${adCountdown})` : "Continuar"}
              </button>
            </div>
          </div>
        </div>
      )}

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
