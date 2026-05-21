import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import { PrismaClient } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import { authRoutes } from "./routes/auth";
import { playerRoutes } from "./routes/players";
import { guardianRoutes } from "./routes/guardians";
import { withdrawalRoutes } from "./routes/withdrawals";
import { farmingRoutes } from "./routes/farming";
import { referralRoutes } from "./routes/referrals";
import { adminRoutes } from "./routes/admin";
import { depositRoutes } from "./routes/deposits";
import { setupFarmingQueue } from "./jobs/farming";
import { setupWithdrawalQueue } from "./jobs/withdrawals";
import { authMiddleware } from "./middleware/auth";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const prisma = new PrismaClient();

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(jwt, { secret: process.env.JWT_SECRET || "secret" });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  await app.register(websocket);

  app.decorate("authenticate", authMiddleware);

  // Decorate request with prisma
  app.decorateRequest("prisma", prisma);

  // Register routes
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(playerRoutes, { prefix: "/api/players" });
  await app.register(guardianRoutes, { prefix: "/api/guardians" });
  await app.register(withdrawalRoutes, { prefix: "/api/withdrawals" });
  await app.register(farmingRoutes, { prefix: "/api/farming" });
  await app.register(referralRoutes, { prefix: "/api/referrals" });
  await app.register(depositRoutes, { prefix: "/api/deposits" });
  await app.register(adminRoutes, { prefix: "/api/admin" });

  // Health check
  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  // Setup job queues
  if (process.env.REDIS_URL) {
    setupFarmingQueue();
    setupWithdrawalQueue();
  }

  const port = parseInt(process.env.PORT || "3001");
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`ALPHA Backend running on port ${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
