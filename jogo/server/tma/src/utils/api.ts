const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

function getToken() {
  return localStorage.getItem("token");
}

function setToken(token: string) {
  localStorage.setItem("token", token);
}

function getAdminKey() {
  return localStorage.getItem("admin_key");
}

function setAdminKey(key: string) {
  localStorage.setItem("admin_key", key);
}

function clearAdminKey() {
  localStorage.removeItem("admin_key");
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
  const adminKey = getAdminKey();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(adminKey ? { "x-admin-key": adminKey } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  setAdminKey,
  clearAdminKey,
  hasToken: () => Boolean(getToken()),

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

  adminWebLogin: async (id: string, code: string) => {
    const res = await request("/admin/web-login", { method: "POST", body: JSON.stringify({ id, code }) });
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

  // Admin
  adminDashboard: () => request("/admin/dashboard"),
  adminGetConfig: () => request("/admin/config"),
  adminSetConfig: (key: string, value: string) =>
    request("/admin/config", { method: "POST", body: JSON.stringify({ key, value }) }),

  adminCreateWebSession: (ttlMinutes = 10) =>
    request("/admin/web-session", { method: "POST", body: JSON.stringify({ ttlMinutes }) }),

  adminListPlayers: (search?: string, page = 1, limit = 20) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", String(limit));
    return request(`/admin/players?${params.toString()}`);
  },

  adminGetPlayer: (id: string) => request(`/players/${id}`),
  adminEditBalance: (id: string, field: string, amount: number, reason: string) =>
    request(`/players/${id}/balance`, { method: "PATCH", body: JSON.stringify({ field, amount, reason }) }),
  adminBan: (id: string, banType: "soft" | "hard") => request(`/admin/players/${id}/ban`, { method: "POST", body: JSON.stringify({ banType }) }),
  adminUnban: (id: string) => request(`/admin/players/${id}/unban`, { method: "POST", body: JSON.stringify({}) }),
  adminDeactivateGuardian: (id: string) => request(`/admin/guardians/${id}/deactivate`, { method: "POST", body: JSON.stringify({}) }),
};
