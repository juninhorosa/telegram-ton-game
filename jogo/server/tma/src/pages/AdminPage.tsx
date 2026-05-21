import { useEffect, useMemo, useState } from "react";
import { api } from "../utils/api";
import { usePlayerStore } from "../utils/store";

type ConfigRow = { key: string; value: string };

export function AdminPage() {
  const player = usePlayerStore();
  const [dashboard, setDashboard] = useState<any>(null);
  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isAdmin = Boolean(player.isAdmin);

  const defaultKeys = useMemo(
    () => [
      "ve_to_ton_rate",
      "withdraw_fee_percent",
      "withdraw_cooldown_days",
      "free_withdraw_wait_days",
      "ad_reward_ve",
      "ad_reward_cooldown_hours",
      "bot_farm_price_ve",
      "bot_farm_roi_days",
      "bot_farm_purchase_cooldown_hours",
    ],
    []
  );

  useEffect(() => {
    const load = async () => {
      try {
        const [d, c] = await Promise.all([
          api.adminDashboard(),
          api.adminGetConfig(),
        ]);
        setDashboard(d);
        const merged = [...c];
        for (const k of defaultKeys) {
          if (!merged.find((r: any) => r.key === k)) merged.push({ key: k, value: "" });
        }
        merged.sort((a: any, b: any) => String(a.key).localeCompare(String(b.key)));
        setConfigs(merged);
        setError("");
      } catch {
        setError("Sem acesso ao painel admin.");
      }
    };
    load();
  }, [defaultKeys]);

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold">Admin</h1>
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a] text-sm text-gray-300">
          Sem permissão.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Admin</h1>

      {error && (
        <div className="bg-[#1a1a2e] rounded-xl p-3 border border-red-500/30 text-center">
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {dashboard && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a]">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-[#252540] rounded-lg p-3">
              <div className="text-xs text-gray-400">Players</div>
              <div className="text-lg font-semibold">{dashboard.totalPlayers}</div>
            </div>
            <div className="bg-[#252540] rounded-lg p-3">
              <div className="text-xs text-gray-400">Pending Withdrawals</div>
              <div className="text-lg font-semibold">{dashboard.pendingWithdrawals}</div>
            </div>
            <div className="bg-[#252540] rounded-lg p-3">
              <div className="text-xs text-gray-400">Pending Deposits</div>
              <div className="text-lg font-semibold">{dashboard.pendingDeposits ?? 0}</div>
            </div>
            <div className="bg-[#252540] rounded-lg p-3">
              <div className="text-xs text-gray-400">Active 24h</div>
              <div className="text-lg font-semibold">{dashboard.activePlayers24h}</div>
            </div>
            <div className="bg-[#252540] rounded-lg p-3">
              <div className="text-xs text-gray-400">VE in Circulation</div>
              <div className="text-lg font-semibold">{Number(dashboard.veInCirculation || 0).toFixed(2)}</div>
            </div>
            <div className="bg-[#252540] rounded-lg p-3">
              <div className="text-xs text-gray-400">Withdrawn TON</div>
              <div className="text-lg font-semibold">{Number(dashboard?.totals?.withdrawnTON || 0).toFixed(4)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a] space-y-3">
        <h2 className="text-sm font-semibold text-gray-300">Configurações</h2>

        <div className="space-y-2">
          {configs.map((row) => (
            <div key={row.key} className="flex gap-2 items-center">
              <div className="w-56 text-xs text-gray-400 font-mono">{row.key}</div>
              <input
                value={row.value ?? ""}
                onChange={(e) =>
                  setConfigs((prev) =>
                    prev.map((p) => (p.key === row.key ? { ...p, value: e.target.value } : p))
                  )
                }
                className="flex-1 bg-[#252540] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
              />
              <button
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await api.adminSetConfig(row.key, String(row.value ?? ""));
                    setError("");
                  } catch {
                    setError("Falha ao salvar configuração.");
                  }
                  setSaving(false);
                }}
                className="bg-[#252540] px-3 py-2 rounded-lg text-xs text-gray-300 disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
