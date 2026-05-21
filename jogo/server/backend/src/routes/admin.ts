import { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
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

export async function adminRoutes(app: FastifyInstance) {
  // Dashboard metrics
  app.get("/dashboard", { preHandler: [app.authenticate, requireAdminAccess] }, async () => {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [activePlayers24h, activePlayers7d, totalPlayers, pendingWithdrawals, pendingDeposits, veAgg, withdrawnAgg, depositAgg, configRows] =
      await Promise.all([
      prisma.player.count({ where: { lastCollectAt: { gte: last24h } } }),
      prisma.player.count({ where: { lastCollectAt: { gte: last7d } } }),
      prisma.player.count(),
      prisma.withdrawal.count({ where: { status: "pending" } }),
      prisma.deposit.count({ where: { status: "pending" } }),
      prisma.player.aggregate({ _sum: { veBalance: true } }),
      prisma.withdrawal.aggregate({
        where: { status: { in: ["approved", "processing", "completed"] } },
        _sum: { veAmount: true, tonAmount: true },
      }),
      prisma.player.aggregate({ _sum: { tonDepositedTotal: true } }),
      prisma.systemConfig.findMany({ where: { key: { not: "admin_player_id" } } }),
    ]);

    return {
      activePlayers24h,
      activePlayers7d,
      totalPlayers,
      pendingWithdrawals,
      pendingDeposits,
      veInCirculation: veAgg._sum.veBalance || 0,
      totals: {
        withdrawnVE: withdrawnAgg._sum.veAmount || 0,
        withdrawnTON: withdrawnAgg._sum.tonAmount || 0,
        depositedTON: depositAgg._sum.tonDepositedTotal || 0,
      },
      config: Object.fromEntries(configRows.map((r) => [r.key, r.value])),
    };
  });

  // Get all withdrawals (admin)
  app.get("/withdrawals", { preHandler: [app.authenticate, requireAdminAccess] }, async (request) => {
    const { status, page = 1, limit = 20 } = request.query as {
      status?: string;
      page?: number;
      limit?: number;
    };

    const where = status ? { status } : {};
    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        include: { player: { select: { username: true, telegramId: true } } },
        orderBy: { requestedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.withdrawal.count({ where }),
    ]);

    return { withdrawals, total, page, totalPages: Math.ceil(total / limit) };
  });

  // Approve withdrawal
  app.post("/withdrawals/:id/approve", { preHandler: [app.authenticate, requireAdminAccess] }, async (request) => {
    const { id } = request.params as { id: string };
    const user = request.user as { id: string; username: string };

    const withdrawal = await prisma.withdrawal.update({
      where: { id },
      data: { status: "approved", processedAt: new Date(), processedById: user.id },
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        adminName: user.username,
        action: "approve_withdrawal",
        target: id,
        details: `Approved withdrawal of ${withdrawal.veAmount} VE`,
      },
    });

    return withdrawal;
  });

  // Reject withdrawal
  app.post("/withdrawals/:id/reject", { preHandler: [app.authenticate, requireAdminAccess] }, async (request) => {
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason: string };
    const user = request.user as { id: string; username: string };

    const withdrawal = await prisma.withdrawal.update({
      where: { id },
      data: { status: "rejected", rejectionReason: reason, processedAt: new Date(), processedById: user.id },
    });

    // Refund VE
    await prisma.player.update({
      where: { id: withdrawal.playerId },
      data: { veBalance: { increment: withdrawal.veAmount } },
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        adminName: user.username,
        action: "reject_withdrawal",
        target: id,
        details: `Rejected withdrawal. Reason: ${reason}`,
      },
    });

    return withdrawal;
  });

  // Get audit log
  app.get("/audit-log", { preHandler: [app.authenticate, requireAdminAccess] }, async () => {
    return prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  });

  // Get all players (admin)
  app.get("/players", { preHandler: [app.authenticate, requireAdminAccess] }, async (request) => {
    const { search, page = 1, limit = 20 } = request.query as {
      search?: string;
      page?: number;
      limit?: number;
    };

    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: "insensitive" as const } },
            { telegramId: search,
            },
          ],
        }
      : {};

    const skip = (page - 1) * limit;

    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
        include: { guardians: { where: { isActive: true }, select: { id: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.player.count({ where }),
    ]);

    return { players, total, page, totalPages: Math.ceil(total / limit) };
  });

  // Ban player
  app.post("/players/:id/ban", { preHandler: [app.authenticate, requireAdminAccess] }, async (request) => {
    const { id } = request.params as { id: string };
    const { banType } = request.body as { banType: "soft" | "hard" };
    const user = request.user as { id: string; username: string };

    const player = await prisma.player.update({
      where: { id },
      data: { isBanned: true, banType },
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        adminName: user.username,
        action: "ban_player",
        target: id,
        details: `${banType} banned ${player.username}`,
      },
    });

    return player;
  });

  app.get("/config", { preHandler: [app.authenticate, requireAdminAccess] }, async () => {
    return prisma.systemConfig.findMany({
      where: { key: { not: "admin_player_id" } },
      orderBy: { key: "asc" },
    });
  });

  app.post("/config", { preHandler: [app.authenticate, requireAdminAccess] }, async (request) => {
    const { key, value } = request.body as { key: string; value: string };
    const user = request.user as { id: string; username: string };

    if (!key || typeof key !== "string") return { error: "Invalid key" };
    if (key === "admin_player_id") return { error: "Forbidden key" };

    const row = await prisma.systemConfig.upsert({
      where: { key },
      create: { key, value: String(value ?? "") },
      update: { value: String(value ?? "") },
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        adminName: user.username,
        action: "set_config",
        target: key,
        details: `Set ${key}=${String(value ?? "")}`,
      },
    });

    return row;
  });

  app.get("/deposits", { preHandler: [app.authenticate, requireAdminAccess] }, async (request) => {
    const { status, page = 1, limit = 20 } = request.query as {
      status?: string;
      page?: number;
      limit?: number;
    };

    const where = status ? { status } : {};
    const skip = (page - 1) * limit;

    const [deposits, total] = await Promise.all([
      prisma.deposit.findMany({
        where,
        include: { player: { select: { username: true, telegramId: true } } },
        orderBy: { requestedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.deposit.count({ where }),
    ]);

    return { deposits, total, page, totalPages: Math.ceil(total / limit) };
  });

  app.post("/deposits/:id/approve", { preHandler: [app.authenticate, requireAdminAccess] }, async (request) => {
    const { id } = request.params as { id: string };
    const user = request.user as { id: string; username: string };

    const deposit = await prisma.deposit.findUnique({ where: { id } });
    if (!deposit) return { error: "Deposit not found" };
    if (deposit.status === "approved") return deposit;

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const d = await tx.deposit.update({
        where: { id },
        data: { status: "approved", approvedAt: new Date() },
      });

      await tx.player.update({
        where: { id: deposit.playerId },
        data: { tonDepositedTotal: { increment: deposit.tonAmount } },
      });

      await tx.transaction.create({
        data: {
          playerId: deposit.playerId,
          type: "deposit_approved",
          amount: deposit.tonAmount,
          currency: "TON",
          description: `Deposit approved: ${deposit.txHash}`,
        },
      });

      await tx.auditLog.create({
        data: {
          adminId: user.id,
          adminName: user.username,
          action: "approve_deposit",
          target: id,
          details: `Approved deposit of ${deposit.tonAmount} TON`,
        },
      });

      return d;
    });

    return updated;
  });
}
