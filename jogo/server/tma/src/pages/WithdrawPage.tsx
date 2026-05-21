import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../utils/api";
import { usePlayerStore } from "../utils/store";
import { ArrowDownToLine, Wallet, Clock, CheckCircle, XCircle } from "lucide-react";

export function WithdrawPage() {
  const { veBalance, economy, withdrawEligibility } = usePlayerStore();
  const [amount, setAmount] = useState("");
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { api.getWithdrawals().then(setWithdrawals).catch(() => {}); }, []);

  const handleWithdraw = async () => {
    setError("");
    setSuccess("");
    const val = parseFloat(amount);
    if (isNaN(val) || val < 10) { setError("Minimum withdrawal: 10 VE"); return; }
    if (val > veBalance) { setError("Insufficient balance"); return; }
    if (withdrawEligibility && !withdrawEligibility.canWithdraw) { setError(withdrawEligibility.reason || "Not eligible"); return; }

    setLoading(true);
    try {
      const result = await api.requestWithdrawal(val);
      if (result.error) { setError(result.error); }
      else {
        setSuccess(`Withdrawal of ${val} VE requested!`);
        setAmount("");
        setWithdrawals((prev) => [result, ...prev]);
      }
    } catch (err) {
      setError("Request failed");
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
      <h1 className="text-lg font-bold">Withdraw</h1>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-void-800 to-[#1a1a2e] rounded-xl p-4 border border-void-500/30">
        <p className="text-xs text-gray-400 mb-1">Available Balance</p>
        <p className="text-3xl font-bold text-cyan-400">{veBalance.toFixed(2)} VE</p>
        {economy && <p className="text-xs text-gray-500 mt-1">≈ {(veBalance * economy.veToTonRate).toFixed(6)} TON</p>}
      </div>

      {/* Withdraw Form */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a]">
        {withdrawEligibility && !withdrawEligibility.canWithdraw && (
          <div className="text-xs text-amber-300 mb-3">
            {withdrawEligibility.reason}
          </div>
        )}
        <div className="flex gap-2 mb-3">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (min 10 VE)"
            className="flex-1 bg-[#252540] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
          />
          <button
            onClick={() => setAmount(veBalance.toFixed(2))}
            className="bg-[#252540] px-3 py-2 rounded-lg text-xs text-gray-400"
          >
            MAX
          </button>
        </div>

        {amount && (
          <div className="text-xs text-gray-500 mb-3 space-y-1">
            <p>
              Fee: {(economy?.withdrawFeePercent ?? 5)}% → Net: {(parseFloat(amount || "0") * (1 - (economy?.withdrawFeePercent ?? 5) / 100)).toFixed(2)} VE
            </p>
            {economy && (
              <p>
                You receive: ~{(parseFloat(amount || "0") * (1 - economy.withdrawFeePercent / 100) * economy.veToTonRate).toFixed(6)} TON
              </p>
            )}
          </div>
        )}

        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
        {success && <p className="text-emerald-400 text-xs mb-2">{success}</p>}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleWithdraw}
          disabled={loading || !amount || (withdrawEligibility ? !withdrawEligibility.canWithdraw : false)}
          className="w-full bg-gradient-to-r from-void-500 to-cyber-500 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {loading ? "Processing..." : "Request Withdrawal"}
        </motion.button>
      </div>

      {/* Withdrawal History */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 mb-3">History</h2>
        {withdrawals.length > 0 ? (
          <div className="space-y-2">
            {withdrawals.map((w) => (
              <div key={w.id} className="bg-[#1a1a2e] rounded-xl p-3 border border-[#2a2a4a] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {statusIcons[w.status]}
                  <div>
                    <p className="text-sm font-medium">{w.veAmount} VE</p>
                    <p className="text-xs text-gray-500">{new Date(w.requestedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 capitalize">{w.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 text-sm py-4">No withdrawals yet</p>
        )}
      </div>
    </div>
  );
}
