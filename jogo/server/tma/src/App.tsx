import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { useTonWallet } from "@tonconnect/ui-react";
import { Layout } from "./components/layout/Layout";
import { MainPage } from "./pages/MainPage";
import { GuardiansPage } from "./pages/GuardiansPage";
import { ReferralsPage } from "./pages/ReferralsPage";
import { WithdrawPage } from "./pages/WithdrawPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AdminPage } from "./pages/AdminPage";
import { WebLoginPage } from "./pages/WebLoginPage";
import { api, isTelegramWebApp } from "./utils/api";
import { usePlayerStore } from "./utils/store";

export default function App() {
  const wallet = useTonWallet();
  const { isAuthReady, authError, setAuth, setPlayer, tonWallet } = usePlayerStore();

  useEffect(() => {
    const run = async () => {
      try {
        if (isTelegramWebApp()) {
          await api.loginFromTelegram();
        } else if (!api.hasToken()) {
          setAuth(false, "Abra pelo Telegram. Admin no PC: use /web-login.");
          return;
        }
        const profile = await api.getProfile();
        setPlayer(profile);
        setAuth(true);
      } catch {
        setAuth(false, isTelegramWebApp() ? "Falha no login. Tente reabrir pelo Telegram." : "Sessão expirada. Gere um novo login web.");
      }
    };
    run();
  }, [setAuth, setPlayer]);

  useEffect(() => {
    const addr = wallet?.account?.address;
    if (!addr) return;
    if (tonWallet === addr) return;

    api.connectWallet(addr)
      .then(() => api.getProfile())
      .then((profile) => setPlayer(profile))
      .catch(() => {});
  }, [wallet?.account?.address, setPlayer, tonWallet]);

  if (authError) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-[#1a1a2e] border border-[#2a2a4a] rounded-2xl p-5 space-y-3">
          <h1 className="text-lg font-semibold">ALPHA</h1>
          <p className="text-sm text-gray-300">{authError}</p>
        </div>
      </div>
    );
  }

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-sm text-gray-400">Carregando…</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/guardians" element={<GuardiansPage />} />
          <Route path="/referrals" element={<ReferralsPage />} />
          <Route path="/withdraw" element={<WithdrawPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/web-login" element={<WebLoginPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
