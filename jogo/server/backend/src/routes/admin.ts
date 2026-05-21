import { FastifyInstance } from "fastify";
import { prisma } from "../index";

export async function adminRoutes(app: FastifyInstance) {
  // Dashboard metrics
  app.get("/dashboard", { preHandler: [app.authenticate] }, async () => {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [activePlayers24h, activePlayers7d, totalPlayers, pendingWithdrawals, veAgg] = await Promise.all([
      prisma.player.count({ where: { lastCollectAt: { gte: last24h } } }),
      prisma.player.count({ where: { lastCollectAt: { gte: last7d } } }),
      prisma.player.count(),
      prisma.withdrawal.count({ where: { status: "pending" } }),
      prisma.player.aggregate({ _sum: { veBalance: true } }),
    ]);

    return {
      activePlayers24h,
      activePlayers7d,
      totalPlayers,
      pendingWithdrawals,
      veInCirculation: veAgg._sum.veBalance || 0,
    };
  });

  // Get all withdrawals (admin)
  app.get("/withdrawals", { preHandler: [app.authenticate] }, async (request) => {
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
  app.post("/withdrawals/:id/approve", { preHandler: [app.authenticate] }, async (request) => {
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
  app.post("/withdrawals/:id/reject", { preHandler: [app.authenticate] }, async (request) => {
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
  app.get("/audit-log", { preHandler: [app.authenticate] }, async () => {
    return prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  });

  // Get all players (admin)
  app.get("/players", { preHandler: [app.authenticate] }, async (request) => {
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
  app.post("/players/:id/ban", { preHandler: [app.authenticate] }, async (request) => {
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
}
