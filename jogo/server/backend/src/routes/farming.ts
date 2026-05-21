import { FastifyInstance } from "fastify";
import { prisma } from "../index";

export async function farmingRoutes(app: FastifyInstance) {
  // Collect farming resources
  app.post("/collect", { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user as { id: string };

    const player = await prisma.player.findUniqueOrThrow({
      where: { id: user.id },
      include: { guardians: { where: { isActive: true } } },
    });

    const now = new Date();
    const lastCollect = player.lastCollectAt || player.createdAt;
    const hoursSinceLastCollect = Math.min(
      (now.getTime() - lastCollect.getTime()) / (1000 * 60 * 60),
      48 // cap at 48h
    );

    if (hoursSinceLastCollect < 0.01) {
      return { error: "Too soon to collect" };
    }

    const totalVEPerHour = player.guardians.reduce((sum: number, g: { vePerHour: number }) => sum + g.vePerHour, 0);
    const totalCSPerHour = player.guardians.reduce((sum: number, g: { csPerHour: number }) => sum + g.csPerHour, 0);

    const earnedVE = totalVEPerHour * hoursSinceLastCollect;
    const earnedCS = Math.round(totalCSPerHour * hoursSinceLastCollect);

    await prisma.player.update({
      where: { id: user.id },
      data: {
        veBalance: { increment: earnedVE },
        csBalance: { increment: earnedCS },
        pendingVE: 0,
        pendingCS: 0,
        lastCollectAt: now,
      },
    });

    return {
      earnedVE: parseFloat(earnedVE.toFixed(4)),
      earnedCS,
      hoursSinceLastCollect: parseFloat(hoursSinceLastCollect.toFixed(2)),
      totalVEPerHour,
      totalCSPerHour,
    };
  });

  // Get farming status
  app.get("/status", { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user as { id: string };

    const player = await prisma.player.findUniqueOrThrow({
      where: { id: user.id },
      include: { guardians: { where: { isActive: true } } },
    });

    const now = new Date();
    const lastCollect = player.lastCollectAt || player.createdAt;
    const hoursSinceLastCollect = Math.min(
      (now.getTime() - lastCollect.getTime()) / (1000 * 60 * 60),
      48
    );

    const totalVEPerHour = player.guardians.reduce((sum: number, g: { vePerHour: number }) => sum + g.vePerHour, 0);
    const totalCSPerHour = player.guardians.reduce((sum: number, g: { csPerHour: number }) => sum + g.csPerHour, 0);

    return {
      pendingVE: parseFloat((totalVEPerHour * hoursSinceLastCollect).toFixed(4)),
      pendingCS: Math.round(totalCSPerHour * hoursSinceLastCollect),
      hoursSinceLastCollect: parseFloat(hoursSinceLastCollect.toFixed(2)),
      totalVEPerHour,
      totalCSPerHour,
      guardianCount: player.guardians.length,
      capHours: 48,
    };
  });
}
