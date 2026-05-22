import { create } from "zustand";

interface PlayerState {
  id: string;
  username: string;
  tonWallet?: string | null;
  isAdmin: boolean;
  level: number;
  xp: number;
  veBalance: number;
  csBalance: number;
  pendingVE: number;
  pendingCS: number;
  totalVEPerHour: number;
  totalCSPerHour: number;
  guardianCount: number;
  referralCount: number;
  economy?: {
    veToTonRate: number;
    withdrawFeePercent: number;
    withdrawCooldownDays: number;
    freeWithdrawWaitDays: number;
  };
  publicConfig?: {
    adLink: string;
    adMinSeconds: number;
    moneytagScriptSrc: string;
    moneytagShowFn: string;
    moneytagShowPayload: string;
    moneytagZone: string;
  };
  withdrawEligibility?: {
    canWithdraw: boolean;
    reason: string | null;
    cooldownUntil: string | null;
    hasDeposit: boolean;
  };
  isAuthReady: boolean;
  authError: string;
  isLoaded: boolean;
  setPlayer: (data: Partial<PlayerState>) => void;
  updateBalances: (ve: number, cs: number) => void;
  setAuth: (isReady: boolean, error?: string) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  id: "",
  username: "",
  tonWallet: null,
  isAdmin: false,
  level: 1,
  xp: 0,
  veBalance: 0,
  csBalance: 0,
  pendingVE: 0,
  pendingCS: 0,
  totalVEPerHour: 0,
  totalCSPerHour: 0,
  guardianCount: 0,
  referralCount: 0,
  economy: undefined,
  publicConfig: undefined,
  withdrawEligibility: undefined,
  isAuthReady: false,
  authError: "",
  isLoaded: false,
  setPlayer: (data) => set((state) => ({ ...state, ...data, isLoaded: true })),
  updateBalances: (ve, cs) =>
    set((state) => ({
      veBalance: state.veBalance + ve,
      csBalance: state.csBalance + cs,
      pendingVE: 0,
      pendingCS: 0,
    })),
  setAuth: (isReady, error) => set(() => ({ isAuthReady: isReady, authError: error || "" })),
}));
