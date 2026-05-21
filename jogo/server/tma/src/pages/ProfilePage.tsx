import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { usePlayerStore } from "../utils/store";
import { Wallet, Shield, Calendar, Activity } from "lucide-react";

export function ProfilePage() {
  const player = usePlayerStore();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => { api.getProfile().then(setProfile).catch(() => {}); }, []);

  const connectWallet = () => {
    // In production: use TonConnect UI
    const wallet = prompt("Enter TON wallet address:");
    if (wallet) {
      api.connectWallet(wallet).then(() => {
        setProfile((prev: any) => ({ ...prev, tonWallet: wallet }));
      });
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Profile</h1>

      {/* Profile Card */}
      <div className="bg-gradient-to-br from-void-800 to-[#1a1a2e] rounded-xl p-4 border border-void-500/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-void-600 flex items-center justify-center text-lg">
            👤
          </div>
          <div>
            <h2 className="font-semibold">{player.username || "Player"}</h2>
            <p className="text-xs text-gray-500">ID: {profile?.telegramId || "..."}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#252540] rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-cyan-400">{profile?.guardianCount || 0}</p>
            <p className="text-xs text-gray-500">Guardians</p>
          </div>
          <div className="bg-[#252540] rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-purple-400">{profile?.referralCount || 0}</p>
            <p className="text-xs text-gray-500">Referrals</p>
          </div>
        </div>
      </div>

      {/* Wallet Connection */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a]">
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={16} className="text-cyan-400" />
          <h3 className="text-sm font-semibold">TON Wallet</h3>
        </div>
        {profile?.tonWallet ? (
          <div className="bg-[#252540] rounded-lg p-3">
            <p className="text-xs font-mono text-gray-300">{profile.tonWallet}</p>
            <p className="text-xs text-emerald-400 mt-1">✓ Connected</p>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            className="w-full bg-void-600 py-2 rounded-lg text-sm"
          >
            Connect Wallet
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a]">
        <h3 className="text-sm font-semibold mb-3">Statistics</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400 flex items-center gap-2">
              <Calendar size={14} /> Member Since
            </span>
            <span className="text-sm">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "..."}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400 flex items-center gap-2">
              <Activity size={14} /> Total Withdrawn
            </span>
            <span className="text-sm text-cyan-400">{profile?.totalWithdrawn?.toFixed(2) || "0.00"} VE</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400 flex items-center gap-2">
              <Shield size={14} /> Risk Score
            </span>
            <span className="text-sm">{profile?.riskScore || 0}/100</span>
          </div>
        </div>
      </div>
    </div>
  );
}
