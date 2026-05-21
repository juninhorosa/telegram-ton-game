const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  // Auth
  login: (telegramId: string, username: string, referralCode?: string) =>
    request("/auth/telegram", {
      method: "POST",
      body: JSON.stringify({ telegramId, username, referralCode }),
    }),

  connectWallet: (wallet: string) =>
    request("/auth/connect-wallet", {
      method: "POST",
      body: JSON.stringify({ wallet }),
    }),

  // Player
  getProfile: () => request("/players/me"),

  // Farming
  collect: () => request("/farming/collect", { method: "POST" }),
  getFarmingStatus: () => request("/farming/status"),

  // Guardians
  getGuardians: () => request("/guardians"),
  buyGuardian: (rarity: string, payWith: "ton" | "ve") =>
    request("/guardians/buy", {
      method: "POST",
      body: JSON.stringify({ rarity, payWith }),
    }),
  upgradeGuardian: (id: string) =>
    request(`/guardians/${id}/upgrade`, { method: "POST" }),
  fuseGuardians: (rarity: string) =>
    request("/guardians/fuse", {
      method: "POST",
      body: JSON.stringify({ rarity }),
    }),

  // Withdrawals
  requestWithdrawal: (amount: number) =>
    request("/withdrawals", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
  getWithdrawals: () => request("/withdrawals/me"),

  // Referrals
  getReferrals: () => request("/referrals"),
  getReferralLink: () => request("/referrals/link"),
};
