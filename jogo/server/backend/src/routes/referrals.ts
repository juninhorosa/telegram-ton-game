import { FastifyInstance } from "fastify";
import { prisma } from "../index";

function getBotUsername() {
  const raw = (process.env.BOT_USERNAME || process.env.TELEGRAM_BOT_USERNAME || "alphap2ebot").trim();
  return raw.replace(/^@/, "");
}

export async function referralRoutes(app: FastifyInstance) {
  // Get referral info
  app.get("/", { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user as { id: string };

    const player = await prisma.player.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        referrals: {
          select: { id: true, username: true, createdAt: true },
        },
      },
    });

    // Level 2 referrals
    const level2 = await prisma.player.findMany({
      where: { referredById: { in: player.referrals.map((r: { id: string }) => r.id) } },
      select: { id: true, username: true, createdAt: true, referredById: true },
    });

    // Level 3 referrals
    const level3 = await prisma.player.findMany({
      where: { referredById: { in: level2.map((r: { id: string }) => r.id) } },
      select: { id: true, username: true, createdAt: true, referredById: true },
    });

    // Total commissions
    const commissions = await prisma.referralCommission.aggregate({
      where: { referrerId: user.id },
      _sum: { veAmount: true },
    });

    return {
      referralCode: player.referralCode,
      level1: player.referrals,
      level2,
      level3,
      totalCommissions: commissions._sum.veAmount || 0,
    };
  });

  // Generate referral link
  app.get("/link", { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user as { id: string };
    const player = await prisma.player.findUniqueOrThrow({ where: { id: user.id } });
    const botUsername = getBotUsername();

    return {
      link: `https://t.me/${botUsername}?start=${player.referralCode}`,
      code: player.referralCode,
    };
  });
}
