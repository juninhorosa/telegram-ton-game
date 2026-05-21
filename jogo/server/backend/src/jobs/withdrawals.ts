import { Queue, Worker } from "bullmq";
import { prisma } from "../index";

const connection = { connection: { url: process.env.REDIS_URL || "redis://localhost:6379" } };

export const withdrawalQueue = new Queue("withdrawals", connection);

export function setupWithdrawalQueue() {
  const worker = new Worker("withdrawals", async (job) => {
    if (job.name === "process-approved") {
      const approved = await prisma.withdrawal.findMany({
        where: { status: "approved" },
      });

      for (const withdrawal of approved) {
        // In production: call TON smart contract to transfer
        await prisma.withdrawal.update({
          where: { id: withdrawal.id },
          data: { status: "processing" },
        });
      }
    }

    if (job.name === "check-fraud") {
      const recentPlayers = await prisma.player.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
          withdrawals: { some: { status: "pending" } },
        },
      });

      for (const player of recentPlayers) {
        if (player.riskScore < 60) {
          await prisma.player.update({
            where: { id: player.id },
            data: { riskScore: { increment: 30 } },
          });
          await prisma.fraudFlag.create({
            data: {
              playerId: player.id,
              type: "rapid_withdrawal",
              description: "Account created + withdrawal attempt in < 48h",
            },
          });
        }
      }
    }
  }, connection);

  // Schedule fraud check every 6 hours
  withdrawalQueue.add("check-fraud", {}, { repeat: { every: 6 * 60 * 60 * 1000 } });

  worker.on("completed", (job) => {
    console.log(`Withdrawal job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Withdrawal job ${job?.id} failed:`, err);
  });
}
