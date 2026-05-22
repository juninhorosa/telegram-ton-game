import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../utils/api";
import { usePlayerStore } from "../utils/store";
import { ArrowDownToLine, Wallet, Clock, CheckCircle, XCircle } from "lucide-react";

export function WithdrawPage() {
  const { veBalance, tonBalance, economy, withdrawEligibility, setPlayer } = usePlayerStore();
  const [tab, setTab] = useState<"withdraw" | "deposit" | "convert">("withdraw");
  const [amount, setAmount] = useState("");
  const [tonAmount, setTonAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api.getWithdrawals().then(setWithdrawals).catch(() => {});
    api.getDeposits().then(setDeposits).catch(() => {});
  }, []);

  const handleWithdraw = async () => {
    setError("");
    setSuccess("");
    const val = parseFloat(tonAmount);
    if (isNaN(val) || val <= 0) { setError("Informe o valor em TON"); return; }
    if (val > tonBalance) { setError("Saldo TON insuficiente"); return; }
    if (withdrawEligibility && !withdrawEligibility.canWithdraw) { setError(withdrawEligibility.reason || "Not eligible"); return; }

    setLoading(true);
    try {
      const result = await api.requestWithdrawal({ tonAmount: val } as any);
      if (result.error) { setError(result.error); }
      else {
        setSuccess(`Saque de ${val.toFixed(6)} TON solicitado!`);
        setTonAmount("");
        setWithdrawals((prev) => [result, ...prev]);
        api.getProfile().then(setPlayer).catch(() => {});
      }
    } catch (err) {
      setError("Request failed");
    }
    setLoading(false);
  };

  const handleDeposit = async () => {
    setError("");
    setSuccess("");
    const val = parseFloat(tonAmount);
    if (isNaN(val) || val <= 0) { setError("Informe o valor em TON"); return; }
    if (!txHash || txHash.length < 8) { setError("Informe o TX hash"); return; }

    setLoading(true);
    try {
      const result = await api.requestDeposit(val, txHash.trim());
      if (result.error) setError(result.error);
      else {
        setSuccess("Depósito enviado para aprovação.");
        setTonAmount("");
        setTxHash("");
        setDeposits((prev) => [result, ...prev]);
      }
    } catch {
      setError("Falha ao solicitar depósito");
    }
    setLoading(false);
  };

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock size={14} className="text-amber-400" />,
    approved: <CheckCircle size={14} className="text-emerald-400" />,
    rejected: <XCircle size={14} className="text-red-400" />,
    processing: <div className="animate-spin h-3 w-3 border-b-2 border-blue-400 rounded-full" />,
    completed: <CheckCircle size={14} className="text-cyan-400" />,
    failed: <XCircle size={14} className="text-gray-400" />,
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Carteira</h1>

      <div className="flex gap-2 overflow-x-auto">
        {[
          { k: "deposit", label: "Depositar" },
          { k: "withdraw", label: "Sacar" },
          { k: "convert", label: "Câmbio" },
        ].map((t: any) => (
          <button
            key={t.k}
            onClick={() => { setTab(t.k); setError(""); setSuccess(""); }}
            className={`px-3 py-2 rounded-lg text-xs border ${tab === t.k ? "bg-[#252540] border-void-500/40 text-white" : "bg-[#1a1a2e] border-[#2a2a4a] text-gray-400"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-void-800 to-[#1a1a2e] rounded-xl p-4 border border-void-500/30">
        <p className="text-xs text-gray-400 mb-2">Saldos</p>
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500">VE</div>
            <div className="text-2xl font-bold text-cyan-400">{veBalance.toFixed(2)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">TON</div>
            <div className="text-2xl font-bold text-amber-200">{tonBalance.toFixed(6)}</div>
          </div>
        </div>
        {economy && (
          <p className="text-xs text-gray-500 mt-2">
            Taxa: 1 VE ≈ {economy.veToTonRate.toFixed(6)} TON
          </p>
        )}
      </div>

      {tab === "withdraw" && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a]">
          {withdrawEligibility && !withdrawEligibility.canWithdraw && (
            <div className="text-xs text-amber-300 mb-3">
              {withdrawEligibility.reason}
            </div>
          )}
          <div className="flex gap-2 mb-3">
            <input
              type="number"
              value={tonAmount}
              onChange={(e) => setTonAmount(e.target.value)}
              placeholder="Valor em TON"
              className="flex-1 bg-[#252540] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
            />
            <button
              onClick={() => setTonAmount(tonBalance.toFixed(6))}
              className="bg-[#252540] px-3 py-2 rounded-lg text-xs text-gray-400"
            >
              MAX
            </button>
          </div>

          {tonAmount && (
            <div className="text-xs text-gray-500 mb-3 space-y-1">
              <p>
                Taxa: {(economy?.withdrawFeePercent ?? 5)}% → Líquido: {(parseFloat(tonAmount || "0") * (1 - (economy?.withdrawFeePercent ?? 5) / 100)).toFixed(6)} TON
              </p>
            </div>
          )}

          {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
          {success && <p className="text-emerald-400 text-xs mb-2">{success}</p>}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleWithdraw}
            disabled={loading || !tonAmount || (withdrawEligibility ? !withdrawEligibility.canWithdraw : false)}
            className="w-full bg-gradient-to-r from-void-500 to-cyber-500 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "Processando..." : "Solicitar saque"}
          </motion.button>
        </div>
      )}

      {tab === "deposit" && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a] space-y-3">
          <div className="text-xs text-gray-400">
            Envie TON para sua carteira e cole o TX hash para aprovação manual.
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={tonAmount}
              onChange={(e) => setTonAmount(e.target.value)}
              placeholder="Valor em TON"
              className="flex-1 bg-[#252540] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
            />
          </div>
          <input
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="TX hash"
            className="w-full bg-[#252540] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 font-mono"
          />

          {error && <p className="text-red-400 text-xs">{error}</p>}
          {success && <p className="text-emerald-400 text-xs">{success}</p>}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleDeposit}
            disabled={loading || !tonAmount || !txHash}
            className="w-full bg-gradient-to-r from-void-500 to-cyber-500 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Solicitar depósito"}
          </motion.button>
        </div>
      )}

      {tab === "convert" && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a] space-y-3">
          <div className="text-xs text-gray-400">Câmbio (informativo): 1 VE ≈ {(economy?.veToTonRate ?? 0.005).toFixed(6)} TON</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#252540] rounded-lg p-3">
              <div className="text-xs text-gray-400">VE → TON</div>
              <div className="text-sm font-mono text-cyan-300">{(Number(amount || 0) || 0).toFixed(2)} VE</div>
              <div className="text-xs text-amber-200 mt-1">≈ {((Number(amount || 0) || 0) * (economy?.veToTonRate ?? 0.005)).toFixed(6)} TON</div>
            </div>
            <div className="bg-[#252540] rounded-lg p-3">
              <div className="text-xs text-gray-400">TON → VE</div>
              <div className="text-sm font-mono text-amber-200">{(Number(tonAmount || 0) || 0).toFixed(6)} TON</div>
              <div className="text-xs text-cyan-300 mt-1">≈ {((Number(tonAmount || 0) || 0) / (economy?.veToTonRate ?? 0.005)).toFixed(2)} VE</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="VE"
              className="bg-[#252540] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
            />
            <input
              type="number"
              value={tonAmount}
              onChange={(e) => setTonAmount(e.target.value)}
              placeholder="TON"
              className="bg-[#252540] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}
          {success && <p className="text-emerald-400 text-xs">{success}</p>}

          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={loading}
              onClick={async () => {
                setError("");
                setSuccess("");
                const val = parseFloat(amount);
                if (!Number.isFinite(val) || val <= 0) return setError("Informe VE");
                if (val > veBalance) return setError("Saldo VE insuficiente");
                setLoading(true);
                try {
                  const res = await api.exchangeVeToTon(val);
                  if (res?.error) setError(String(res.error));
                  else {
                    setSuccess(`Convertido: ${res.tonAmount} TON`);
                    api.getProfile().then(setPlayer).catch(() => {});
                  }
                } catch {
                  setError("Falha ao converter");
                }
                setLoading(false);
              }}
              className="bg-[#252540] px-3 py-2 rounded-lg text-xs text-gray-200 disabled:opacity-50"
            >
              VE → TON
            </button>
            <button
              disabled={loading}
              onClick={async () => {
                setError("");
                setSuccess("");
                const val = parseFloat(tonAmount);
                if (!Number.isFinite(val) || val <= 0) return setError("Informe TON");
                if (val > tonBalance) return setError("Saldo TON insuficiente");
                setLoading(true);
                try {
                  const res = await api.exchangeTonToVe(val);
                  if (res?.error) setError(String(res.error));
                  else {
                    setSuccess(`Convertido: ${res.veAmount} VE`);
                    api.getProfile().then(setPlayer).catch(() => {});
                  }
                } catch {
                  setError("Falha ao converter");
                }
                setLoading(false);
              }}
              className="bg-[#252540] px-3 py-2 rounded-lg text-xs text-gray-200 disabled:opacity-50"
            >
              TON → VE
            </button>
          </div>
        </div>
      )}

      {/* Withdrawal History */}
      {tab === "withdraw" && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Histórico de saques</h2>
          {withdrawals.length > 0 ? (
            <div className="space-y-2">
              {withdrawals.map((w) => (
                <div key={w.id} className="bg-[#1a1a2e] rounded-xl p-3 border border-[#2a2a4a] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusIcons[w.status]}
                    <div>
                      <p className="text-sm font-medium">{Number(w.tonAmount || 0).toFixed(6)} TON</p>
                      <p className="text-xs text-gray-500">{new Date(w.requestedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 capitalize">{w.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 text-sm py-4">Nenhum saque ainda</p>
          )}
        </div>
      )}

      {tab === "deposit" && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Histórico de depósitos</h2>
          {deposits.length > 0 ? (
            <div className="space-y-2">
              {deposits.map((d) => (
                <div key={d.id} className="bg-[#1a1a2e] rounded-xl p-3 border border-[#2a2a4a] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusIcons[d.status] || statusIcons.pending}
                    <div>
                      <p className="text-sm font-medium">{Number(d.tonAmount || 0).toFixed(3)} TON</p>
                      <p className="text-xs text-gray-500 font-mono truncate max-w-[220px]">{d.txHash}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 capitalize">{d.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 text-sm py-4">Nenhum depósito ainda</p>
          )}
        </div>
      )}
    </div>
  );
}
