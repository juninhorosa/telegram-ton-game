import { AdminUser, AuditLogEntry, NotificationSetting } from "./types";

export const adminUsers: AdminUser[] = [
  { id: "A001", email: "admin@cryptorealm.io", name: "Super Admin", role: "super_admin", isActive: true, lastLoginAt: "2026-05-18T14:00:00Z", twoFactorEnabled: true },
  { id: "A002", email: "moderator@cryptorealm.io", name: "Moderator", role: "admin", isActive: true, lastLoginAt: "2026-05-18T10:00:00Z", twoFactorEnabled: true },
  { id: "A003", email: "viewer@cryptorealm.io", name: "Viewer", role: "viewer", isActive: true, lastLoginAt: "2026-05-17T16:00:00Z", twoFactorEnabled: false },
  { id: "A004", email: "analyst@cryptorealm.io", name: "Data Analyst", role: "viewer", isActive: false, lastLoginAt: "2026-05-10T10:00:00Z", twoFactorEnabled: false },
];

export const auditLog: AuditLogEntry[] = [
  { id: "AL001", adminId: "A001", adminName: "Super Admin", action: "approve_withdrawal", target: "W003", details: "Approved withdrawal of 10.20 VE for guardian_master", timestamp: "2026-05-18T11:30:00Z" },
  { id: "AL002", adminId: "A001", adminName: "Super Admin", action: "reject_withdrawal", target: "W007", details: "Rejected withdrawal for void_breaker. Reason: Suspicious farming pattern", timestamp: "2026-05-17T15:00:00Z" },
  { id: "AL003", adminId: "A001", adminName: "Super Admin", action: "ban_player", target: "P007", details: "Soft banned void_breaker for fraudulent farming", timestamp: "2026-05-17T15:00:00Z" },
  { id: "AL004", adminId: "A002", adminName: "Moderator", action: "edit_balance", target: "P002", details: "Added 50 VE to crypto_hunter. Reason: Compensation for downtime", timestamp: "2026-05-16T14:00:00Z" },
  { id: "AL005", adminId: "A001", adminName: "Super Admin", action: "update_economy", target: "global_limits", details: "Changed minWithdrawalVe from 5 to 10", timestamp: "2026-05-15T10:00:00Z" },
  { id: "AL006", adminId: "A002", adminName: "Moderator", action: "confirm_fraud", target: "FC001", details: "Confirmed fraud case for void_breaker", timestamp: "2026-05-17T15:00:00Z" },
  { id: "AL007", adminId: "A001", adminName: "Super Admin", action: "create_admin", target: "A004", details: "Created viewer account for Data Analyst", timestamp: "2026-05-10T10:00:00Z" },
  { id: "AL008", adminId: "A002", adminName: "Moderator", action: "approve_withdrawal", target: "W006", details: "Approved withdrawal of 15.30 VE for idle_king", timestamp: "2026-05-17T18:00:00Z" },
];

export const notificationSettings: NotificationSetting[] = [
  { id: "NS001", name: "Low Treasury Balance", description: "Alert when Treasury falls below safety threshold", enabled: true, channel: ["telegram", "email"] },
  { id: "NS002", name: "Pending Withdrawals", description: "Alert when withdrawal queue exceeds threshold", enabled: true, channel: ["telegram"] },
  { id: "NS003", name: "Fraud Detection", description: "Alert when high-risk accounts are detected", enabled: true, channel: ["telegram", "email"] },
  { id: "NS004", name: "Blockchain Errors", description: "Alert on failed on-chain transactions", enabled: true, channel: ["telegram", "email"] },
  { id: "NS005", name: "Daily Summary", description: "Daily report of key metrics", enabled: false, channel: ["email"] },
  { id: "NS006", name: "New Registration Spike", description: "Alert on unusual registration activity", enabled: true, channel: ["telegram"] },
];

export const mockSettings = {
  admins: adminUsers,
  auditLog: auditLog,
  notifications: notificationSettings,
  maintenanceMode: false,
  maintenanceMessage: "We are currently performing scheduled maintenance. Please check back later.",
  lastBackup: "2026-05-18T06:00:00Z",
  botToken: "7012345678:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  webhookUrl: "https://api.cryptorealm.io/webhook/telegram",
};

export async function fetchSystemSettings() {
  await new Promise((r) => setTimeout(r, 300));
  return JSON.parse(JSON.stringify(mockSettings));
}

export async function fetchAdmins(): Promise<AdminUser[]> {
  await new Promise((r) => setTimeout(r, 200));
  return [...adminUsers];
}

export async function fetchAuditLog(): Promise<AuditLogEntry[]> {
  await new Promise((r) => setTimeout(r, 200));
  return [...auditLog];
}
