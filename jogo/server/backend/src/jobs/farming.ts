import { Queue, Worker } from "bullmq";
import { prisma } from "../index";

const connection = { connection: { url: process.env.REDIS_URL || "redis://localhost:6379" } };

export const farmingQueue = new Queue("farming", connection);

export function setupFarmingQueue() {
  const worker = new Worker("farming", async (job) => {
    if (job.name === "process-tick") {
      const players = await prisma.player.findMany({
        where: { isBanned: false },
        include: { guardians: { where: { isActive: true } } },
      });

      for (const player of players) {
        const totalVEPerHour = player.guardians.reduce((sum: number, g: { vePerHour: number }) => sum + g.vePerHour, 0);
        const totalCSPerHour = player.guardians.reduce((sum: number, g: { csPerHour: number }) => sum + g.csPerHour, 0);

        await prisma.player.update({
          where: { id: player.id },
          data: {
            pendingVE: { increment: totalVEPerHour },
            pendingCS: { increment: totalCSPerHour },
          },
        });
      }
    }
  }, connection);

  // Schedule farming tick every hour
  farmingQueue.add("process-tick", {}, { repeat: { every: 60 * 60 * 1000 } });

  worker.on("completed", (job) => {
    console.log(`Farming job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Farming job ${job?.id} failed:`, err);
  });
}
