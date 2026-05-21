import { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../index";

const registerSchema = z.object({
  telegramId: z.string(),
  username: z.string().min(3).max(32),
  referralCode: z.string().optional(),
  initData: z.string().optional(),
});

const loginSchema = z.object({
  telegramId: z.string(),
  username: z.string(),
});

function verifyTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false as const, reason: "missing_hash" as const };

  const entries: string[] = [];
  params.forEach((value, key) => {
    if (key === "hash") return;
    entries.push(`${key}=${value}`);
  });
  entries.sort();
  const dataCheckString = entries.join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  if (calculatedHash !== hash) return { ok: false as const, reason: "bad_hash" as const };

  const authDate = params.get("auth_date");
  if (!authDate) return { ok: false as const, reason: "missing_auth_date" as const };

  return { ok: true as const };
}

async function getNumberConfig(key: string, fallback: number) {
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  if (!row) return fallback;
  const n = Number(row.value);
  return Number.isFinite(n) ? n : fallback;
}

function computeVePerHourFromTonRoi(tonPrice: number, roiDays: number, veToTonRate: number) {
  const tonPerDay = tonPrice / roiDays;
  const vePerDay = tonPerDay / veToTonRate;
  return vePerDay / 24;
}

export async function authRoutes(app: FastifyInstance) {
  // Register / Login via Telegram
  app.post("/telegram", async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken && body.initData) {
      const check = verifyTelegramInitData(body.initData, botToken);
      if (!check.ok) {
        reply.code(401);
        return { error: "Invalid Telegram login" };
      }
    }

    let player = await prisma.player.findUnique({
      where: { telegramId: body.telegramId },
    });

    if (!player) {
      const referralCode = `CR${Date.now().toString(36).toUpperCase()}`;
      let referredById: string | undefined;

      if (body.referralCode) {
        const referrer = await prisma.player.findUnique({
          where: { referralCode: body.referralCode },
        });
        if (referrer) referredById = referrer.id;
      }

      player = await prisma.$transaction(async (tx) => {
        const created = await tx.player.create({
          data: {
            telegramId: body.telegramId,
            username: body.username,
            referralCode,
            referredById,
            csBalance: 100, // Welcome bonus
          },
        });

        try {
          await tx.systemConfig.create({ data: { key: "admin_player_id", value: created.id } });
          return tx.player.update({ where: { id: created.id }, data: { isAdmin: true } });
        } catch (err) {
          if (err && typeof err === "object" && (err as Prisma.PrismaClientKnownRequestError).code === "P2002") {
            return created;
          }
          throw err;
        }
      });

      // Give free Common guardian
      const veToTonRate = await getNumberConfig("ve_to_ton_rate", 0.005);
      const vePerHour = computeVePerHourFromTonRoi(0.5, 60, veToTonRate);
      await prisma.guardian.create({
        data: {
          playerId: player.id,
          name: "Aether Sprite",
          rarity: "common",
          level: 1,
          farmingPower: 1.0,
          vePerHour,
          csPerHour: 12,
        },
      });
    }

    if (!player) throw new Error("Player not found");

    if (!player.isAdmin) {
      const adminRow = await prisma.systemConfig.findUnique({ where: { key: "admin_player_id" } });
      if (!adminRow) {
        const currentPlayer = player;
        player = await prisma.$transaction(async (tx) => {
          try {
            await tx.systemConfig.create({ data: { key: "admin_player_id", value: currentPlayer.id } });
            return tx.player.update({ where: { id: currentPlayer.id }, data: { isAdmin: true } });
          } catch (err) {
            if (err && typeof err === "object" && (err as Prisma.PrismaClientKnownRequestError).code === "P2002") {
              return currentPlayer;
            }
            throw err;
          }
        });
      }
    }

    const token = app.jwt.sign({
      id: player.id,
      telegramId: player.telegramId,
      username: player.username,
    });

    return { token, player: { id: player.id, username: player.username } };
  });

  // Connect TON wallet
  app.post("/connect-wallet", { preHandler: [app.authenticate] }, async (request) => {
    const { wallet } = request.body as { wallet: string };
    const user = request.user as { id: string };

    await prisma.player.update({
      where: { id: user.id },
      data: { tonWallet: wallet },
    });

    return { success: true };
  });
}
