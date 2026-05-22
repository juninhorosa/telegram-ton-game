import { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import crypto from "node:crypto";
import { prisma } from "../index";

async function getNumberConfig(client: any, key: string, fallback: number) {
  const row = await client.systemConfig.findUnique({ where: { key } });
  if (!row) return fallback;
  const raw = String(row.value ?? "").trim();
  const normalized = raw.includes(",") && !raw.includes(".") ? raw.replace(",", ".") : raw;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : fallback;
}

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
  app.post("/web-login", async (request, reply) => {
    const { id, code } = request.body as { id: string; code: string };
    if (!id || !code) {
      reply.code(400);
      return { error: "Missing id/code" };
    }

    const session = await prisma.adminWebSession.findUnique({ where: { id } });
    if (!session) {
      reply.code(404);
      return { error: "Session not found" };
    }
    if (session.usedAt) {
      reply.code(410);
      return { error: "Session already used" };
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      reply.code(410);
      return { error: "Session expired" };
    }

    const secret = process.env.JWT_SECRET || process.env.ADMIN_API_KEY || "secret";
    const expected = crypto.createHash("sha256").update(`${id}:${code}:${secret}`).digest("hex");
    if (expected !== session.codeHash) {
      reply.code(401);
      return { error: "Invalid code" };
    }

    const admin = await prisma.player.findUnique({ where: { id: session.adminPlayerId } });
    if (!admin || !admin.isAdmin) {
      reply.code(403);
      return { error: "Forbidden" };
    }

    await prisma.adminWebSession.update({ where: { id }, data: { usedAt: new Date() } });

    const token = app.jwt.sign({
      id: admin.id,
      telegramId: admin.telegramId,
      username: admin.username,
    });

    return { token };
  });

  app.post("/web-session", { preHandler: [app.authenticate, requireAdminAccess] }, async (request) => {
    const user = request.user as { id: string };
    const ttlMinutes = Math.max(1, Math.min(60, Number((request.body as any)?.ttlMinutes ?? 10)));

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const secret = process.env.JWT_SECRET || process.env.ADMIN_API_KEY || "secret";

    const created = await prisma.adminWebSession.create({
      data: {
        adminPlayerId: user.id,
        codeHash: "",
        expiresAt,
      },
    });

    const codeHash = crypto.createHash("sha256").update(`${created.id}:${code}:${secret}`).digest("hex");
    await prisma.adminWebSession.update({ where: { id: created.id }, data: { codeHash } });

    return { id: created.id, code, expiresAt: created.expiresAt.toISOString() };
  });

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

  app.post("/players/:id/unban", { preHandler: [app.authenticate, requireAdminAccess] }, async (request) => {
    const { id } = request.params as { id: string };
    const user = request.user as { id: string; username: string };

    const player = await prisma.player.update({
      where: { id },
      data: { isBanned: false, banType: "none" },
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        adminName: user.username,
        action: "unban_player",
        target: id,
        details: `Unbanned ${player.username}`,
      },
    });

    return player;
  });

  app.post("/guardians/:id/deactivate", { preHandler: [app.authenticate, requireAdminAccess] }, async (request) => {
    const { id } = request.params as { id: string };
    const user = request.user as { id: string; username: string };

    const guardian = await prisma.guardian.findUnique({ where: { id } });
    if (!guardian) return { error: "Guardian not found" };
    if (!guardian.isActive) return guardian;

    const updated = await prisma.guardian.update({ where: { id }, data: { isActive: false } });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        adminName: user.username,
        action: "deactivate_guardian",
        target: id,
        details: `Deactivated guardian ${guardian.name} (${guardian.rarity}) for player ${guardian.playerId}`,
      },
    });

    return updated;
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
      const veToTonRate = await getNumberConfig(tx, "ve_to_ton_rate", 0.005);
      const level1Percent = await getNumberConfig(tx, "referral_level1_percent", 10);
      const level2Percent = await getNumberConfig(tx, "referral_level2_percent", 3);
      const level3Percent = await getNumberConfig(tx, "referral_level3_percent", 1);

      const d = await tx.deposit.update({
        where: { id },
        data: { status: "approved", approvedAt: new Date() },
      });

      await tx.player.update({
        where: { id: deposit.playerId },
        data: { tonDepositedTotal: { increment: deposit.tonAmount } },
      });

      const depositor = await tx.player.findUnique({
        where: { id: deposit.playerId },
        select: { id: true, referredById: true },
      });

      if (depositor?.referredById) {
        const l1 = depositor.referredById;
        const l1Player = await tx.player.findUnique({ where: { id: l1 }, select: { id: true, referredById: true } });
        const l2 = l1Player?.referredById || null;
        const l2Player = l2 ? await tx.player.findUnique({ where: { id: l2 }, select: { id: true, referredById: true } }) : null;
        const l3 = l2Player?.referredById || null;

        const veEquivalent = veToTonRate > 0 ? deposit.tonAmount / veToTonRate : 0;
        const payouts: Array<{ referrerId: string; level: number; percent: number }> = [
          { referrerId: l1, level: 1, percent: level1Percent },
          ...(l2 ? [{ referrerId: l2, level: 2, percent: level2Percent }] : []),
          ...(l3 ? [{ referrerId: l3, level: 3, percent: level3Percent }] : []),
        ];

        for (const p of payouts) {
          const veAmount = (veEquivalent * p.percent) / 100;
          if (!Number.isFinite(veAmount) || veAmount <= 0) continue;

          await tx.player.update({
            where: { id: p.referrerId },
            data: { veBalance: { increment: veAmount } },
          });

          await tx.referralCommission.create({
            data: {
              referrerId: p.referrerId,
              referredId: deposit.playerId,
              level: p.level,
              veAmount,
            },
          });

          await tx.transaction.create({
            data: {
              playerId: p.referrerId,
              type: "referral_commission",
              amount: veAmount,
              currency: "VE",
              description: `Referral commission (L${p.level}) from deposit ${deposit.txHash}`,
            },
          });
        }
      }

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
