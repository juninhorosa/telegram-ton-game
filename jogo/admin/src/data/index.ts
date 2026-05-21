// Central data export - swap mock implementations with real API calls here
export { fetchDashboardMetrics } from "./mock-dashboard";
export { fetchWithdrawals, approveWithdrawal, rejectWithdrawal } from "./mock-withdrawals";
export { fetchPlayers, fetchPlayerById, fetchPlayerGuardians, fetchPlayerTransactions, updatePlayerBalance, banPlayer, unbanPlayer } from "./mock-players";
export { fetchEconomyConfig, updateEconomyConfig } from "./mock-economy";
export { fetchFraudCases, fetchDetectionRules, confirmFraud, markFalsePositive } from "./mock-fraud";
export { fetchTreasuryData } from "./mock-treasury";
export { fetchSystemSettings, fetchAdmins, fetchAuditLog } from "./mock-settings";
export type * from "./types";
