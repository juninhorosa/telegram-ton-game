import { FastifyInstance } from "fastify";
import { prisma } from "../index";

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

    return {
      ...player,
      totalVEPerHour,
      totalCSPerHour,
      referralCount: player._count.referrals,
    };
  });

  // Get player by ID (admin)
  app.get("/:id", { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return prisma.player.findUnique({
      where: { id },
      include: { guardians: true, transactions: { take: 20, orderBy: { createdAt: "desc" } } },
    });
  });

  // Update balance (admin)
  app.patch("/:id/balance", { preHandler: [app.authenticate] }, async (request) => {
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
