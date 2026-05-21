import { FastifyInstance } from "fastify";
import { addDays, differenceInCalendarDays } from "date-fns";
import { prisma } from "../index";

async function requireAdminAccess(request: any, reply: any) {
  const adminKey = process.env.ADMIN_API_KEY;
  const provided = request.headers["x-admin-key"];
  if (adminKey && provided === adminKey) return;

  const user = request.user as { id?: string } | undefined;
  if (!user?.id) {
    reply.code(401);
    return reply.send({ error: "Unauthorized" });
  }

  const player = await prisma.player.findUnique({ where: { id: user.id }, select: { isAdmin: true } });
  if (!player?.isAdmin) {
    reply.code(403);
    return reply.send({ error: "Forbidden" });
  }
}

async function getNumberConfig(key: string, fallback: number) {
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  if (!row) return fallback;
  const n = Number(row.value);
  return Number.isFinite(n) ? n : fallback;
}

export async function playerRoutes(app: FastifyInstance) {
  // Get current player profile
  app.get("/me", { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user as { id: string };
    const player = await prisma.player.findUnique({
      where: { id: user.id },
      include: {
        guardians: { where: { isActive: true } },
        _count: { select: { referrals: true } },
      },
    });
    if (!player) throw new Error("Player not found");

    const totalVEPerHour = player.guardians.reduce((sum: number, g: { vePerHour: number }) => sum + g.vePerHour, 0);
    const totalCSPerHour = player.guardians.reduce((sum: number, g: { csPerHour: number }) => sum + g.csPerHour, 0);

    const veToTonRate = await getNumberConfig("ve_to_ton_rate", 0.005);
    const withdrawFeePercent = await getNumberConfig("withdraw_fee_percent", 5);
    const withdrawCooldownDays = await getNumberConfig("withdraw_cooldown_days", 15);
    const freeWithdrawWaitDays = await getNumberConfig("free_withdraw_wait_days", 15);

    const now = new Date();
    const lastWithdrawal = await prisma.withdrawal.findFirst({
      where: { playerId: user.id, status: { in: ["pending", "approved", "processing", "completed"] } },
      orderBy: { requestedAt: "desc" },
      select: { requestedAt: true },
    });

    const withdrawnAgg = await prisma.withdrawal.aggregate({
      where: { playerId: user.id, status: { in: ["approved", "processing", "completed"] } },
      _sum: { veAmount: true, tonAmount: true },
    });

    const cooldownUntil = lastWithdrawal ? addDays(lastWithdrawal.requestedAt, withdrawCooldownDays) : null;
    const cooldownActive = cooldownUntil ? cooldownUntil.getTime() > now.getTime() : false;

    const needsDeposit = player.tonDepositedTotal <= 0;
    const freeWaitActive = needsDeposit && differenceInCalendarDays(now, player.createdAt) < freeWithdrawWaitDays;

    const canWithdraw =
      Boolean(player.tonWallet) &&
      !player.isBanned &&
      !cooldownActive &&
      (!needsDeposit || !freeWaitActive);

    const withdrawBlockReason = !player.tonWallet
      ? "Connect TON wallet first"
      : player.isBanned
        ? "Account is banned"
        : cooldownActive
          ? `Next withdrawal available on ${cooldownUntil!.toISOString()}`
          : needsDeposit && freeWaitActive
            ? `Free users can withdraw after ${freeWithdrawWaitDays} days from start`
            : null;

    return {
      ...player,
      totalVEPerHour,
      totalCSPerHour,
      referralCount: player._count.referrals,
      economy: {
        veToTonRate,
        withdrawFeePercent,
        withdrawCooldownDays,
        freeWithdrawWaitDays,
      },
      withdrawEligibility: {
        canWithdraw,
        reason: withdrawBlockReason,
        cooldownUntil: cooldownUntil?.toISOString() || null,
        hasDeposit: player.tonDepositedTotal > 0,
      },
      totals: {
        withdrawnVE: withdrawnAgg._sum.veAmount || 0,
        withdrawnTON: withdrawnAgg._sum.tonAmount || 0,
      },
    };
  });

  // Get player by ID (admin)
  app.get("/:id", { preHandler: [app.authenticate, requireAdminAccess] }, async (request) => {
    const { id } = request.params as { id: string };
    return prisma.player.findUnique({
      where: { id },
      include: { guardians: true, transactions: { take: 20, orderBy: { createdAt: "desc" } } },
    });
  });

  // Update balance (admin)
  app.patch("/:id/balance", { preHandler: [app.authenticate, requireAdminAccess] }, async (request) => {
    const { id } = request.params as { id: string };
    const { field, amount, reason } = request.body as { field: string; amount: number; reason: string };

    const player = await prisma.player.update({
      where: { id },
      data: { [field]: { increment: amount } },
    });

    await prisma.auditLog.create({
      data: {
        adminId: (request.user as { id: string }).id,
        adminName: (request.user as { username: string }).username,
        action: "edit_balance",
        target: id,
        details: `${amount > 0 ? "Added" : "Removed"} ${Math.abs(amount)} ${field}. Reason: ${reason}`,
      },
    });

    return player;
  });
}
