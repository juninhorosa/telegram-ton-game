// Core entities

export interface Player {
  id: string;
  telegramId: string;
  username: string;
  tonWallet: string | null;
  createdAt: string;
  lastActiveAt: string;
  veBalance: number;
  csBalance: number;
  pendingVE: number;
  pendingCS: number;
  riskScore: number;
  isBanned: boolean;
  banType: "none" | "soft" | "hard";
  referralCode: string;
  referredBy: string | null;
  referralCount: number;
  guardianCount: number;
  totalWithdrawn: number;
  notes: AdminNote[];
  fraudFlags: FraudFlag[];
  daysActive: number;
}

export interface Guardian {
  id: string;
  playerId: string;
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  level: number;
  farmingPower: number;
  vePerHour: number;
  csPerHour: number;
  acquiredAt: string;
}

export interface Withdrawal {
  id: string;
  playerId: string;
  playerUsername: string;
  tonWallet: string;
  veAmount: number;
  tonAmount: number;
  status: "pending" | "approved" | "rejected" | "processing" | "completed" | "failed";
  riskScore: number;
  requestedAt: string;
  processedAt: string | null;
  rejectionReason: string | null;
  processedBy: string | null;
}

export interface Transaction {
  id: string;
  playerId: string;
  type: "purchase" | "withdrawal" | "upgrade" | "fusion" | "referral_commission" | "reward";
  amount: number;
  currency: "VE" | "CS" | "TON";
  createdAt: string;
  description: string;
}

export interface AdminNote {
  id: string;
  adminName: string;
  content: string;
  createdAt: string;
}

export interface FraudFlag {
  id: string;
  type: string;
  description: string;
  detectedAt: string;
}

// Admin entities

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin" | "viewer";
  isActive: boolean;
  lastLoginAt: string;
  twoFactorEnabled: boolean;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  target: string;
  details: string;
  timestamp: string;
}

// Economy config

export interface GuardianPrice {
  id: string;
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  priceTon: number;
  priceVe: number;
}

export interface FarmingRate {
  rarity: "common" | "rare" | "epic" | "legendary";
  vePerHour: number;
  csPerHour: number;
}

export interface LevelMultiplier {
  level: number;
  multiplier: number;
  csCost: number;
}

export interface GlobalLimits {
  maxGuardiansPerAccount: number;
  accumulationCapHours: number;
  minWithdrawalVe: number;
  dailyWithdrawalLimitVe: number;
  withdrawalFeePercent: number;
}

export interface ReferralCommission {
  level: number;
  percent: number;
}

export interface EconomyConfig {
  guardianPrices: GuardianPrice[];
  farmingRates: FarmingRate[];
  levelMultipliers: LevelMultiplier[];
  globalLimits: GlobalLimits;
  referralCommissions: ReferralCommission[];
}

// Dashboard metrics

export interface DashboardMetrics {
  activePlayers24h: number;
  activePlayers7d: number;
  totalPlayers: number;
  veInCirculation: number;
  veBurned: number;
  treasuryTon: number;
  treasuryUsd: number;
  pendingWithdrawals: number;
  totalRevenue: number;
  registrationsPerHour: { hour: string; count: number }[];
  veEmissionHistory: { date: string; emitted: number; burned: number }[];
  alerts: Alert[];
}

export interface Alert {
  id: string;
  type: "critical" | "warning" | "info";
  title: string;
  message: string;
  timestamp: string;
  dismissed: boolean;
  link?: string;
}

// Fraud

export interface FraudCase {
  id: string;
  playerId: string;
  playerUsername: string;
  riskScore: number;
  triggers: FraudTrigger[];
  status: "pending" | "confirmed_fraud" | "false_positive";
  detectedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface FraudTrigger {
  rule: string;
  points: number;
  description: string;
}

export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  threshold: string;
  autoAction: string;
  isEnabled: boolean;
}

// Treasury

export interface TreasuryData {
  balanceTon: number;
  balanceUsd: number;
  contractAddress: string;
  veEmitted: number;
  veBurned: number;
  totalPaidOut: number;
  totalRevenue: number;
  revenueByCategory: { category: string; amount: number }[];
  withdrawalDistribution: { range: string; count: number }[];
  emissionBurnHistory: { date: string; emitted: number; burned: number }[];
}

// Settings

export interface NotificationSetting {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  channel: ("telegram" | "email")[];
}

export interface SystemSettings {
  admins: AdminUser[];
  auditLog: AuditLogEntry[];
  notifications: NotificationSetting[];
  maintenanceMode: boolean;
  maintenanceMessage: string;
  lastBackup: string | null;
  botToken: string;
  webhookUrl: string;
}
