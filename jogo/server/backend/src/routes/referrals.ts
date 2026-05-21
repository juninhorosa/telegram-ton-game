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

    const level1Ids = player.referrals.map((r: { id: string }) => r.id);
    const level2Ids = level2.map((r: { id: string }) => r.id);
    const level3Ids = level3.map((r: { id: string }) => r.id);
    const allIds = [...new Set([...level1Ids, ...level2Ids, ...level3Ids])];

    const [depositsAgg, commissionsByReferred] = await Promise.all([
      allIds.length
        ? prisma.deposit.groupBy({
            by: ["playerId"],
            where: { status: "approved", playerId: { in: allIds } },
            _sum: { tonAmount: true },
          })
        : Promise.resolve([] as any[]),
      allIds.length
        ? prisma.referralCommission.groupBy({
            by: ["referredId"],
            where: { referrerId: user.id, referredId: { in: allIds } },
            _sum: { veAmount: true },
          })
        : Promise.resolve([] as any[]),
    ]);

    const donatedTonByPlayerId = new Map<string, number>();
    for (const row of depositsAgg as any[]) donatedTonByPlayerId.set(row.playerId, Number(row._sum?.tonAmount || 0));

    const commissionVeByReferredId = new Map<string, number>();
    for (const row of commissionsByReferred as any[]) commissionVeByReferredId.set(row.referredId, Number(row._sum?.veAmount || 0));

    function enrich(list: any[]) {
      return list.map((r) => ({
        ...r,
        donatedTON: donatedTonByPlayerId.get(r.id) || 0,
        commissionEarnedVE: commissionVeByReferredId.get(r.id) || 0,
      }));
    }

    const enrichedL1 = enrich(player.referrals);
    const enrichedL2 = enrich(level2);
    const enrichedL3 = enrich(level3);
    const totalDonatedTON = [...donatedTonByPlayerId.values()].reduce((a, b) => a + b, 0);

    return {
      referralCode: player.referralCode,
      level1: enrichedL1,
      level2: enrichedL2,
      level3: enrichedL3,
      totalCommissions: commissions._sum.veAmount || 0,
      totals: {
        donatedTON: totalDonatedTON,
      },
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
