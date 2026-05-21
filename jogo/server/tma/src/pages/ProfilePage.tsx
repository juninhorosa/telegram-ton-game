import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { usePlayerStore } from "../utils/store";
import { Wallet, Shield, Calendar, Activity } from "lucide-react";
import { TonConnectButton, useTonWallet } from "@tonconnect/ui-react";

export function ProfilePage() {
  const player = usePlayerStore();
  const [profile, setProfile] = useState<any>(null);
  const wallet = useTonWallet();

  useEffect(() => { api.getProfile().then(setProfile).catch(() => {}); }, []);

  const xpPerLevel = 1000;
  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const xpIntoLevel = xp % xpPerLevel;
  const xpProgress = Math.min(1, xpIntoLevel / xpPerLevel);

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

        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Level {level}</span>
            <span>{xpIntoLevel}/{xpPerLevel} XP</span>
          </div>
          <div className="h-2 bg-[#252540] rounded-full overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-cyan-500 to-purple-500" style={{ width: `${xpProgress * 100}%` }} />
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
        <div className="pb-3">
          <TonConnectButton />
        </div>
        {profile?.tonWallet ? (
          <div className="bg-[#252540] rounded-lg p-3">
            <p className="text-xs font-mono text-gray-300">{profile.tonWallet}</p>
            <p className="text-xs text-emerald-400 mt-1">✓ Connected</p>
          </div>
        ) : (
          <div className="text-xs text-amber-300">Conecte sua carteira acima para liberar o jogo.</div>
        )}
        {wallet?.account?.address && (
          <div className="text-xs text-gray-500 mt-2 font-mono">
            Detected: {wallet.account.address}
          </div>
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
            <span className="text-sm text-cyan-400">{(profile?.totals?.withdrawnVE || 0).toFixed(2)} VE</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400 flex items-center gap-2">
              <Wallet size={14} /> TON Deposited
            </span>
            <span className="text-sm text-cyan-400">{(profile?.tonDepositedTotal || 0).toFixed(3)} TON</span>
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
