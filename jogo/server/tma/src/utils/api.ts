const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

function getToken() {
  return localStorage.getItem("token");
}

function setToken(token: string) {
  localStorage.setItem("token", token);
}

function getTelegramWebApp() {
  return (window as any).Telegram?.WebApp as any | undefined;
}

export function isTelegramWebApp() {
  const tg = getTelegramWebApp();
  return Boolean(tg && tg.initDataUnsafe && tg.initDataUnsafe.user);
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
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
  login: (telegramId: string, username: string, referralCode?: string, initData?: string) =>
    request("/auth/telegram", {
      method: "POST",
      body: JSON.stringify({ telegramId, username, referralCode, initData }),
    }),

  connectWallet: (wallet: string) =>
    request("/auth/connect-wallet", {
      method: "POST",
      body: JSON.stringify({ wallet }),
    }),

  loginFromTelegram: async () => {
    const tg = getTelegramWebApp();
    const user = tg?.initDataUnsafe?.user;
    if (!tg || !user) throw new Error("Not running inside Telegram");

    const telegramId = String(user.id);
    const username = user.username || user.first_name || "player";
    const referralCode = tg.initDataUnsafe?.start_param || undefined;
    const initData = tg.initData || "";

    const res = await api.login(telegramId, username, referralCode, initData);
    if (res?.token) setToken(res.token);
    return res;
  },

  // Player
  getProfile: () => request("/players/me"),

  // Farming
  collect: () => request("/farming/collect", { method: "POST" }),
  getFarmingStatus: () => request("/farming/status"),
  claimAdReward: () => request("/farming/ads/reward", { method: "POST", body: JSON.stringify({ placement: "daily" }) }),

  // Guardians
  getGuardians: () => request("/guardians"),
  buyGuardian: (rarity: string, payWith: "ton" | "ve") =>
    request("/guardians/buy", {
      method: "POST",
      body: JSON.stringify({ rarity, payWith }),
    }),
  buyBotFarm: () => request("/guardians/bot-farm/buy", { method: "POST", body: JSON.stringify({}) }),
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
