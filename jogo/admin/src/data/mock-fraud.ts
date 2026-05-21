import { FraudCase, DetectionRule } from "./types";

export const fraudCases: FraudCase[] = [
  {
    id: "FC001", playerId: "P007", playerUsername: "void_breaker", riskScore: 85,
    triggers: [
      { rule: "robotic_timing", points: 20, description: "Collection timing < 0.5s variance in 100+ collections" },
      { rule: "rapid_withdrawal", points: 30, description: "Account created + withdrawal attempt in < 48h" },
      { rule: "high_farming_rate", points: 15, description: "Farming rate > 3x average for rarity" },
      { rule: "shared_ip", points: 20, description: "Same IP as 2 other flagged accounts" },
    ],
    status: "confirmed_fraud", detectedAt: "2026-05-17T14:00:00Z", reviewedAt: "2026-05-17T15:00:00Z", reviewedBy: "admin1",
  },
  {
    id: "FC002", playerId: "P005", playerUsername: "ton_whale_99", riskScore: 78,
    triggers: [
      { rule: "rapid_withdrawal", points: 30, description: "Account created + withdrawal attempt in < 48h" },
      { rule: "high_farming_rate", points: 15, description: "Farming rate > 3x average for rarity" },
      { rule: "shared_device", points: 25, description: "Same device fingerprint as banned account" },
      { rule: "referral_same_ip", points: 8, description: "Referred account shares IP" },
    ],
    status: "pending", detectedAt: "2026-05-16T10:00:00Z", reviewedAt: null, reviewedBy: null,
  },
  {
    id: "FC003", playerId: "P004", playerUsername: "shard_collector", riskScore: 65,
    triggers: [
      { rule: "high_farming_rate", points: 15, description: "Farming rate > 3x average for rarity" },
      { rule: "multiple_accounts", points: 10, description: "3+ accounts on same IP" },
      { rule: "rapid_accumulation", points: 20, description: "VE accumulation > 5x average" },
      { rule: "unusual_pattern", points: 20, description: "Collection pattern deviates from normal" },
    ],
    status: "pending", detectedAt: "2026-05-15T10:00:00Z", reviewedAt: null, reviewedBy: null,
  },
  {
    id: "FC004", playerId: "P015", playerUsername: "void_walker_7", riskScore: 55,
    triggers: [
      { rule: "multiple_accounts", points: 10, description: "3+ accounts on same IP" },
      { rule: "unusual_pattern", points: 20, description: "Collection pattern deviates from normal" },
      { rule: "referral_same_ip", points: 8, description: "Referred account shares IP" },
      { rule: "high_farming_rate", points: 15, description: "Farming rate > 3x average for rarity" },
    ],
    status: "false_positive", detectedAt: "2026-05-14T10:00:00Z", reviewedAt: "2026-05-15T10:00:00Z", reviewedBy: "admin2",
  },
];

export const detectionRules: DetectionRule[] = [
  { id: "DR001", name: "Robotic Timing", description: "Collection interval variance < 0.5s over 50+ collections", threshold: "> 50 collections", autoAction: "Yellow flag", isEnabled: true },
  { id: "DR002", name: "Same IP Multi-Account", description: "More than 3 active accounts from same IP", threshold: "> 3 accounts", autoAction: "Red flag + suspend saque", isEnabled: true },
  { id: "DR003", name: "High Farming Rate", description: "Farming rate exceeds 5x average for guardian rarity", threshold: "> 5x average", autoAction: "Red flag", isEnabled: true },
  { id: "DR004", name: "Rapid Withdrawal", description: "Account creation + withdrawal attempt within 48 hours", threshold: "< 48h", autoAction: "Block withdrawal", isEnabled: true },
  { id: "DR005", name: "Referral Same IP", description: "Referral linked to account on same IP", threshold: "Any match", autoAction: "Zero commission", isEnabled: true },
  { id: "DR006", name: "Shared Device", description: "Multiple accounts sharing device fingerprint", threshold: "> 2 accounts", autoAction: "Red flag", isEnabled: true },
];

export async function fetchFraudCases(): Promise<FraudCase[]> {
  await new Promise((r) => setTimeout(r, 300));
  return [...fraudCases];
}

export async function fetchDetectionRules(): Promise<DetectionRule[]> {
  await new Promise((r) => setTimeout(r, 200));
  return [...detectionRules];
}

export async function confirmFraud(caseId: string): Promise<{ success: boolean }> {
  await new Promise((r) => setTimeout(r, 500));
  const c = fraudCases.find((c) => c.id === caseId);
  if (c) { c.status = "confirmed_fraud"; c.reviewedAt = new Date().toISOString(); c.reviewedBy = "admin1"; }
  return { success: true };
}

export async function markFalsePositive(caseId: string): Promise<{ success: boolean }> {
  await new Promise((r) => setTimeout(r, 500));
  const c = fraudCases.find((c) => c.id === caseId);
  if (c) { c.status = "false_positive"; c.reviewedAt = new Date().toISOString(); c.reviewedBy = "admin1"; }
  return { success: true };
}
