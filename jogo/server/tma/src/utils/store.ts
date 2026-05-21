import { create } from "zustand";

interface PlayerState {
  id: string;
  username: string;
  veBalance: number;
  csBalance: number;
  pendingVE: number;
  pendingCS: number;
  totalVEPerHour: number;
  totalCSPerHour: number;
  guardianCount: number;
  referralCount: number;
  isLoaded: boolean;
  setPlayer: (data: Partial<PlayerState>) => void;
  updateBalances: (ve: number, cs: number) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  id: "",
  username: "",
  veBalance: 0,
  csBalance: 0,
  pendingVE: 0,
  pendingCS: 0,
  totalVEPerHour: 0,
  totalCSPerHour: 0,
  guardianCount: 0,
  referralCount: 0,
  isLoaded: false,
  setPlayer: (data) => set((state) => ({ ...state, ...data, isLoaded: true })),
  updateBalances: (ve, cs) =>
    set((state) => ({
      veBalance: state.veBalance + ve,
      csBalance: state.csBalance + cs,
      pendingVE: 0,
      pendingCS: 0,
    })),
}));
