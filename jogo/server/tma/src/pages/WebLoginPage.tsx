import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import { usePlayerStore } from "../utils/store";

export function WebLoginPage() {
  const navigate = useNavigate();
  const { setPlayer, setAuth } = usePlayerStore();
  const [sessionId, setSessionId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("session") || "";
    if (id) setSessionId(id);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">ALPHA Admin (Web)</h1>

      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a] space-y-3">
        <div>
          <div className="text-xs text-gray-400 mb-1">Session ID</div>
          <input
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value.trim())}
            className="w-full bg-[#252540] rounded-lg px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Código (6 dígitos)</div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\s+/g, ""))}
            className="w-full bg-[#252540] rounded-lg px-3 py-2 text-sm text-white"
          />
        </div>

        {error && <div className="text-xs text-red-300">{error}</div>}

        <button
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              await api.adminWebLogin(sessionId, code);
              const profile = await api.getProfile();
              setPlayer(profile);
              setAuth(true);
              navigate("/admin");
            } catch {
              setError("Falha no login web. Gere uma nova sessão no painel admin do Telegram.");
            }
            setLoading(false);
          }}
          className="w-full bg-[#252540] px-3 py-2 rounded-lg text-sm text-gray-200 disabled:opacity-50"
        >
          Entrar
        </button>
      </div>
    </div>
  );
}

