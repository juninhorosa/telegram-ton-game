import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { Copy, Users, Gift } from "lucide-react";

export function ReferralsPage() {
  const [referrals, setReferrals] = useState<any>(null);
  const [link, setLink] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getReferrals().then(setReferrals).catch(() => {});
    api.getReferralLink().then(setLink).catch(() => {});
  }, []);

  const copyLink = () => {
    if (link?.link) {
      navigator.clipboard.writeText(link.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Referrals</h1>

      {/* Referral Link */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-void-500/30">
        <h3 className="text-sm font-semibold mb-2">Your Referral Link</h3>
        <div className="flex gap-2">
          <input
            readOnly
            value={link?.link || "Loading..."}
            className="flex-1 bg-[#252540] rounded-lg px-3 py-2 text-xs text-gray-300"
          />
          <button
            onClick={copyLink}
            className="bg-void-500 px-3 py-2 rounded-lg flex items-center gap-1 text-sm"
          >
            <Copy size={14} />
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Commissions */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-cyan-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Gift size={16} className="text-cyan-400" />
          <h3 className="text-sm font-semibold">Total Commissions</h3>
        </div>
        <div className="text-2xl font-bold text-cyan-400">
          {referrals?.totalCommissions?.toFixed(2) || "0.00"} VE
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Pago apenas quando o referral faz depósito aprovado.
        </div>
      </div>

      {/* Deposits from referrals */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-amber-500/20">
        <h3 className="text-sm font-semibold mb-2">Depósitos dos referrals</h3>
        <div className="text-2xl font-bold text-amber-200">
          {(referrals?.totals?.donatedTON || 0).toFixed(3)} TON
        </div>
        <div className="text-xs text-gray-500 mt-1">Total doado por todos os seus referrals (aprovado).</div>
      </div>

      {/* Commission Structure */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-purple-500/20">
        <h3 className="text-sm font-semibold mb-3">Commission Structure</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2 bg-[#252540] rounded-lg">
            <span className="text-sm">Level 1 (Direct)</span>
            <span className="text-cyan-400 font-bold">10%</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-[#252540] rounded-lg">
            <span className="text-sm">Level 2</span>
            <span className="text-cyan-400 font-bold">3%</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-[#252540] rounded-lg">
            <span className="text-sm">Level 3</span>
            <span className="text-cyan-400 font-bold">1%</span>
          </div>
        </div>
      </div>

      {/* Referral Lists */}
      {[
        { label: "Level 1 (Direct)", data: referrals?.level1, icon: "👤" },
        { label: "Level 2", data: referrals?.level2, icon: "👥" },
        { label: "Level 3", data: referrals?.level3, icon: "👤" },
      ].map(({ label, data, icon }) => (
        <div key={label} className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a]">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Users size={14} /> {label} ({data?.length || 0})
          </h3>
          {data?.length > 0 ? (
            <div className="space-y-2">
              {data.map((r: any) => (
                <div key={r.id} className="p-3 bg-[#252540] rounded-lg border border-[#2a2a4a]">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{icon} {r.username}</span>
                    <span className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg p-2">
                      <div className="text-gray-400">Doou</div>
                      <div className="font-mono text-amber-200">{Number(r.donatedTON || 0).toFixed(3)} TON</div>
                    </div>
                    <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg p-2">
                      <div className="text-gray-400">Comissão</div>
                      <div className="font-mono text-cyan-300">{Number(r.commissionEarnedVE || 0).toFixed(2)} VE</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No referrals yet</p>
          )}
        </div>
      ))}
    </div>
  );
}
