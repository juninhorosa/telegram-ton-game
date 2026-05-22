import { useEffect, useMemo, useState } from "react";
import { api } from "../utils/api";
import { usePlayerStore } from "../utils/store";

type ConfigRow = { key: string; value: string };

export function AdminPage() {
  const player = usePlayerStore();
  const [tab, setTab] = useState<"dashboard" | "players" | "config" | "web">("dashboard");
  const [dashboard, setDashboard] = useState<any>(null);
  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [players, setPlayers] = useState<any[]>([]);
  const [playersSearch, setPlayersSearch] = useState("");
  const [playersPage, setPlayersPage] = useState(1);
  const [playersTotalPages, setPlayersTotalPages] = useState(1);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [balanceField, setBalanceField] = useState<"veBalance" | "csBalance">("veBalance");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceReason, setBalanceReason] = useState("");
  const [webSession, setWebSession] = useState<{ id: string; code: string; expiresAt: string } | null>(null);

  const hasAdminKey = Boolean(localStorage.getItem("admin_key"));
  const canTryAdmin = player.isAdmin || hasAdminKey;

  const defaultKeys = useMemo(
    () => [
      "ve_to_ton_rate",
      "withdraw_fee_percent",
      "withdraw_cooldown_days",
      "free_withdraw_wait_days",
      "ad_reward_ve",
      "ad_reward_cooldown_seconds",
      "ad_link",
      "ad_min_seconds",
      "moneytag_script_src",
      "moneytag_show_fn",
      "moneytag_show_payload",
      "moneytag_zone",
      "bot_farm_price_ve",
      "bot_farm_roi_days",
      "bot_farm_purchase_cooldown_hours",
      "referral_level1_percent",
      "referral_level2_percent",
      "referral_level3_percent",
    ],
    []
  );

  const veToTonRate = useMemo(() => {
    const row = configs.find((c) => c.key === "ve_to_ton_rate");
    const n = Number(row?.value);
    return Number.isFinite(n) && n > 0 ? n : (player.economy?.veToTonRate || 0.005);
  }, [configs, player.economy?.veToTonRate]);

  useEffect(() => {
    const load = async () => {
      if (!canTryAdmin) return;
      try {
        const [d, c] = await Promise.all([api.adminDashboard(), api.adminGetConfig()]);
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
  }, [canTryAdmin, defaultKeys]);

  useEffect(() => {
    const loadPlayers = async () => {
      if (!canTryAdmin) return;
      if (tab !== "players") return;
      try {
        const res = await api.adminListPlayers(playersSearch || undefined, playersPage, 20);
        setPlayers(res.players || []);
        setPlayersTotalPages(res.totalPages || 1);
        setError("");
      } catch {
        setError("Falha ao carregar players.");
      }
    };
    loadPlayers();
  }, [tab, playersSearch, playersPage, canTryAdmin]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Admin</h1>
        <div className="text-xs text-gray-400 font-mono">{player.username}</div>
      </div>

      {!canTryAdmin && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a] space-y-3">
          <div className="text-sm text-gray-300">Sem permissão.</div>
          <div className="text-xs text-gray-400">Se você é o dono, cole a ADMIN_API_KEY aqui (fica salva só no seu navegador).</div>
          <div className="flex gap-2">
            <input
              value={adminKeyInput}
              onChange={(e) => setAdminKeyInput(e.target.value)}
              className="flex-1 bg-[#252540] rounded-lg px-3 py-2 text-sm text-white"
              placeholder="ADMIN_API_KEY"
            />
            <button
              onClick={() => {
                api.setAdminKey(adminKeyInput.trim());
                window.location.reload();
              }}
              className="bg-[#252540] px-3 py-2 rounded-lg text-xs text-gray-200"
            >
              Salvar
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-[#1a1a2e] rounded-xl p-3 border border-red-500/30 text-center">
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {canTryAdmin && (
        <div className="flex gap-2 overflow-x-auto">
          {[
            { k: "dashboard", label: "Status" },
            { k: "players", label: "Players" },
            { k: "config", label: "Config" },
            { k: "web", label: "Web" },
          ].map((t: any) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`px-3 py-2 rounded-lg text-xs border ${tab === t.k ? "bg-[#252540] border-void-500/40 text-white" : "bg-[#1a1a2e] border-[#2a2a4a] text-gray-400"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {canTryAdmin && tab === "dashboard" && dashboard && (
        <div className="space-y-3">
          <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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

          <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a] space-y-2">
            <div className="text-sm font-semibold text-gray-300">Câmbio</div>
            <div className="text-xs text-gray-400">1 VE = {Number(veToTonRate).toFixed(6)} TON</div>
            <div className="text-xs text-gray-400">1 TON = {Number(1 / veToTonRate).toFixed(2)} VE</div>
          </div>
        </div>
      )}

      {canTryAdmin && tab === "config" && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a] space-y-3">
          <h2 className="text-sm font-semibold text-gray-300">Configurações</h2>

          <div className="space-y-2">
            {configs.map((row) => (
              <div key={row.key} className="flex gap-2 items-center">
                <div className="w-40 shrink-0 text-[11px] text-gray-400 font-mono">{row.key}</div>
                <input
                  value={row.value ?? ""}
                  onChange={(e) =>
                    setConfigs((prev) => prev.map((p) => (p.key === row.key ? { ...p, value: e.target.value } : p)))
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
      )}

      {canTryAdmin && tab === "players" && (
        <div className="space-y-3">
          <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a] space-y-3">
            <div className="flex gap-2">
              <input
                value={playersSearch}
                onChange={(e) => {
                  setPlayersSearch(e.target.value);
                  setPlayersPage(1);
                }}
                className="flex-1 bg-[#252540] rounded-lg px-3 py-2 text-sm text-white"
                placeholder="Buscar username ou telegramId"
              />
              <button
                onClick={() => {
                  setPlayersSearch("");
                  setPlayersPage(1);
                }}
                className="bg-[#252540] px-3 py-2 rounded-lg text-xs text-gray-200"
              >
                Limpar
              </button>
            </div>

            <div className="space-y-2">
              {players.map((p) => (
                <button
                  key={p.id}
                  onClick={async () => {
                    try {
                      const full = await api.adminGetPlayer(p.id);
                      setSelectedPlayer(full);
                      setError("");
                    } catch {
                      setError("Falha ao carregar player.");
                    }
                  }}
                  className="w-full text-left bg-[#252540] rounded-lg p-3 border border-[#2a2a4a]"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{p.username}</div>
                    <div className="text-xs text-gray-400">{p.isBanned ? "BANNED" : ""}</div>
                  </div>
                  <div className="text-xs text-gray-400 font-mono">tg: {p.telegramId}</div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400">
              <button
                disabled={playersPage <= 1}
                onClick={() => setPlayersPage((p) => Math.max(1, p - 1))}
                className="bg-[#252540] px-3 py-2 rounded-lg disabled:opacity-40"
              >
                Anterior
              </button>
              <div>
                Página {playersPage}/{playersTotalPages}
              </div>
              <button
                disabled={playersPage >= playersTotalPages}
                onClick={() => setPlayersPage((p) => p + 1)}
                className="bg-[#252540] px-3 py-2 rounded-lg disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>

          {selectedPlayer && (
            <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{selectedPlayer.username}</div>
                  <div className="text-xs text-gray-400 font-mono">{selectedPlayer.id}</div>
                </div>
                <button onClick={() => setSelectedPlayer(null)} className="text-xs text-gray-300 bg-[#252540] px-3 py-2 rounded-lg">
                  Fechar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-[#252540] rounded-lg p-3">
                  <div className="text-gray-400">VE</div>
                  <div className="text-white font-mono">{Number(selectedPlayer.veBalance || 0).toFixed(2)}</div>
                </div>
                <div className="bg-[#252540] rounded-lg p-3">
                  <div className="text-gray-400">CS</div>
                  <div className="text-white font-mono">{Number(selectedPlayer.csBalance || 0).toFixed(0)}</div>
                </div>
              </div>

              <div className="flex gap-2">
                {selectedPlayer.isBanned ? (
                  <button
                    onClick={async () => {
                      await api.adminUnban(selectedPlayer.id);
                      const full = await api.adminGetPlayer(selectedPlayer.id);
                      setSelectedPlayer(full);
                    }}
                    className="bg-[#252540] px-3 py-2 rounded-lg text-xs text-gray-200"
                  >
                    Unban
                  </button>
                ) : (
                  <>
                    <button
                      onClick={async () => {
                        await api.adminBan(selectedPlayer.id, "soft");
                        const full = await api.adminGetPlayer(selectedPlayer.id);
                        setSelectedPlayer(full);
                      }}
                      className="bg-[#252540] px-3 py-2 rounded-lg text-xs text-gray-200"
                    >
                      Ban (soft)
                    </button>
                    <button
                      onClick={async () => {
                        await api.adminBan(selectedPlayer.id, "hard");
                        const full = await api.adminGetPlayer(selectedPlayer.id);
                        setSelectedPlayer(full);
                      }}
                      className="bg-[#252540] px-3 py-2 rounded-lg text-xs text-gray-200"
                    >
                      Ban (hard)
                    </button>
                  </>
                )}
              </div>

              <div className="bg-[#252540] rounded-xl p-3 space-y-2">
                <div className="text-sm font-semibold">Editar saldo</div>
                <div className="flex gap-2">
                  <select
                    value={balanceField}
                    onChange={(e) => setBalanceField(e.target.value as any)}
                    className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg px-2 py-2 text-xs text-white"
                  >
                    <option value="veBalance">VE</option>
                    <option value="csBalance">CS</option>
                  </select>
                  <input
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    className="flex-1 bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg px-3 py-2 text-xs text-white"
                    placeholder="Ex: 100 ou -50"
                  />
                </div>
                <input
                  value={balanceReason}
                  onChange={(e) => setBalanceReason(e.target.value)}
                  className="w-full bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg px-3 py-2 text-xs text-white"
                  placeholder="Motivo"
                />
                <button
                  onClick={async () => {
                    const amount = Number(balanceAmount);
                    if (!Number.isFinite(amount) || !balanceReason.trim()) return;
                    await api.adminEditBalance(selectedPlayer.id, balanceField, amount, balanceReason.trim());
                    const full = await api.adminGetPlayer(selectedPlayer.id);
                    setSelectedPlayer(full);
                    setBalanceAmount("");
                    setBalanceReason("");
                  }}
                  className="bg-[#1a1a2e] border border-[#2a2a4a] px-3 py-2 rounded-lg text-xs text-gray-200"
                >
                  Aplicar
                </button>
              </div>

              <div className="bg-[#252540] rounded-xl p-3 space-y-2">
                <div className="text-sm font-semibold">Guardians</div>
                <div className="space-y-2">
                  {(selectedPlayer.guardians || []).filter((g: any) => g.isActive).map((g: any) => (
                    <div key={g.id} className="flex items-center justify-between bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg p-2">
                      <div className="min-w-0">
                        <div className="text-xs text-white truncate">{g.name} ({g.rarity})</div>
                        <div className="text-[11px] text-gray-400 font-mono truncate">{g.id}</div>
                      </div>
                      <button
                        onClick={async () => {
                          await api.adminDeactivateGuardian(g.id);
                          const full = await api.adminGetPlayer(selectedPlayer.id);
                          setSelectedPlayer(full);
                        }}
                        className="bg-[#252540] px-3 py-2 rounded-lg text-[11px] text-gray-200"
                      >
                        Deletar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {canTryAdmin && tab === "web" && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a] space-y-3">
          <h2 className="text-sm font-semibold text-gray-300">Acesso no PC</h2>
          <div className="text-xs text-gray-400">
            Gere uma sessão (1 uso). Abra o link no navegador do PC e digite o código.
          </div>
          <button
            onClick={async () => {
              try {
                const s = await api.adminCreateWebSession(10);
                setWebSession(s);
                setError("");
              } catch {
                setError("Falha ao gerar sessão web.");
              }
            }}
            className="bg-[#252540] px-3 py-2 rounded-lg text-xs text-gray-200"
          >
            Gerar sessão
          </button>

          {webSession && (
            <div className="bg-[#252540] rounded-xl p-3 space-y-2">
              <div className="text-xs text-gray-400">Link</div>
              <div className="text-xs font-mono break-all text-gray-200">
                {new URL(`/web-login?session=${encodeURIComponent(webSession.id)}`, window.location.origin).toString()}
              </div>
              <div className="text-xs text-gray-400">Código</div>
              <div className="text-lg font-bold tracking-widest text-white">{webSession.code}</div>
              <div className="text-[11px] text-gray-400">Expira: {new Date(webSession.expiresAt).toLocaleString()}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
