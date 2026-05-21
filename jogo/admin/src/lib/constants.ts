export const APP_NAME = "CryptoRealm Admin";
export const APP_DESCRIPTION = "Guardians of the Void - Admin Dashboard";

export const ADMIN_ACCOUNTS = [
  { email: "admin@cryptorealm.io", password: "admin123", role: "super_admin" as const, name: "Super Admin" },
  { email: "moderator@cryptorealm.io", password: "mod123", role: "admin" as const, name: "Moderator" },
  { email: "viewer@cryptorealm.io", password: "view123", role: "viewer" as const, name: "Viewer" },
];

export const ROLE_PERMISSIONS = {
  super_admin: { screens: [1, 2, 3, 4, 5, 6, 7], canEdit: true, canApprove: true },
  admin: { screens: [1, 2, 3, 5, 6], canEdit: true, canApprove: true },
  viewer: { screens: [1, 3, 6], canEdit: false, canApprove: false },
};

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", screen: 1 },
  { label: "Withdrawals", href: "/withdrawals", icon: "ArrowDownToLine", screen: 2 },
  { label: "Players", href: "/players", icon: "Users", screen: 3 },
  { label: "Economy", href: "/economy", icon: "Coins", screen: 4 },
  { label: "Anti-Fraud", href: "/fraud", icon: "ShieldAlert", screen: 5 },
  { label: "Treasury", href: "/treasury", icon: "Vault", screen: 6 },
  { label: "Settings", href: "/settings", icon: "Settings", screen: 7 },
];

export const RARITY_LABELS: Record<string, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};
