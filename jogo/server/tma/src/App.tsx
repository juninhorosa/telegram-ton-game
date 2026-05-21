import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { MainPage } from "./pages/MainPage";
import { GuardiansPage } from "./pages/GuardiansPage";
import { ReferralsPage } from "./pages/ReferralsPage";
import { WithdrawPage } from "./pages/WithdrawPage";
import { ProfilePage } from "./pages/ProfilePage";

export default function App() {
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
