import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { TonConnectButton, useTonWallet } from "@tonconnect/ui-react";
import { Layout } from "./components/layout/Layout";
import { MainPage } from "./pages/MainPage";
import { GuardiansPage } from "./pages/GuardiansPage";
import { ReferralsPage } from "./pages/ReferralsPage";
import { WithdrawPage } from "./pages/WithdrawPage";
import { ProfilePage } from "./pages/ProfilePage";
import { api, isTelegramWebApp } from "./utils/api";
import { usePlayerStore } from "./utils/store";

export default function App() {
  const wallet = useTonWallet();
  const { isAuthReady, authError, setAuth, setPlayer, tonWallet } = usePlayerStore();

  useEffect(() => {
    const run = async () => {
      if (!isTelegramWebApp()) {
        setAuth(false, "Abra este jogo pelo Telegram");
        return;
      }

      try {
        await api.loginFromTelegram();
        const profile = await api.getProfile();
        setPlayer(profile);
        setAuth(true);
      } catch {
        setAuth(false, "Falha no login. Tente reabrir pelo Telegram.");
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
          <h1 className="text-lg font-semibold">CryptoRealm</h1>
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

  if (!tonWallet) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-[#1a1a2e] border border-[#2a2a4a] rounded-2xl p-5 space-y-3">
          <h1 className="text-lg font-semibold">Conectar carteira</h1>
          <p className="text-sm text-gray-300">
            Para entrar no jogo, conecte uma carteira TON.
          </p>
          <div className="pt-2">
            <TonConnectButton />
          </div>
        </div>
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
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
