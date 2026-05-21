import "dotenv/config";
import { Telegraf, Context } from "telegraf";
import http from "node:http";

const BOT_TOKEN = process.env.BOT_TOKEN || "";
const WEBAPP_URL = process.env.WEBAPP_URL || "https://tma.cryptorealm.io";
const API_BASE = process.env.API_BASE || "http://localhost:3001/api";
const WEBHOOK_URL = process.env.WEBHOOK_URL || "";
const PORT = parseInt(process.env.PORT || "3000");

const bot = new Telegraf(BOT_TOKEN);
const tokenCache = new Map<string, string>();

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

// Helper: API call
async function apiCall(path: string, opts?: { token?: string; body?: any }) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts?.body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return (await res.json()) as any;
}

async function ensureToken(ctx: Context) {
  const from = ctx.from;
  if (!from) throw new Error("Missing Telegram user");
  const telegramId = from.id.toString();
  const cached = tokenCache.get(telegramId);
  if (cached) return cached;

  const username = from.username || from.first_name || "player";
  const auth = (await apiCall("/auth/telegram", {
    body: { telegramId, username },
  })) as { token?: string };
  const token = auth?.token as string | undefined;
  if (!token) throw new Error("No token returned by API");
  tokenCache.set(telegramId, token);
  return token;
}

// Start command
bot.start(async (ctx) => {
  const referralCode = ctx.startPayload || undefined;
  const user = ctx.from;

  // Register player
  const auth = (await apiCall("/auth/telegram", {
    body: {
      telegramId: user.id.toString(),
      username: user.username || user.first_name,
      referralCode,
    },
  })) as { token?: string };
  if (auth?.token) tokenCache.set(user.id.toString(), auth.token);

  await ctx.reply(
    `Welcome to *CryptoRealm: Guardians of the Void!*`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎮 Play Now", web_app: { url: WEBAPP_URL } }],
          [{ text: "📋 My Profile", callback_data: "profile" }],
          [{ text: "👥 Referrals", callback_data: "referrals" }],
          [{ text: "❓ Help", callback_data: "help" }],
        ],
      },
    }
  );
});

// Profile
bot.action("profile", async (ctx) => {
  try {
    const token = await ensureToken(ctx);
    const data = await apiCall(`/players/me`, { token });
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `*Your Profile*\n\n` +
      `👤 Username: ${data.username}\n` +
      `⚡ VE Balance: ${data.veBalance?.toFixed(2) || "0.00"}\n` +
      `💎 CS Balance: ${data.csBalance?.toLocaleString() || "0"}\n` +
      `🛡️ Guardians: ${data.guardianCount || 0}\n` +
      `👥 Referrals: ${data.referralCount || 0}\n` +
      `📊 Risk Score: ${data.riskScore || 0}/100`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🎮 Open Game", web_app: { url: WEBAPP_URL } }],
            [{ text: "🔙 Back", callback_data: "back" }],
          ],
        },
      }
    );
  } catch (err) {
    await ctx.answerCbQuery("Please start the bot first with /start");
  }
});

// Referrals
bot.action("referrals", async (ctx) => {
  try {
    const token = await ensureToken(ctx);
    const data = await apiCall(`/referrals/link`, { token });
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `*Invite Friends & Earn!*\n\n` +
      `Share your referral link:\n\`${data.link}\`\n\n` +
      `*Commission Structure:*\n` +
      `• Level 1 (Direct): 10%\n` +
      `• Level 2: 3%\n` +
      `• Level 3: 1%\n\n` +
      `Commissions are paid in VE from the Marketing reserve.`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📤 Share Link", url: `https://t.me/share/url?url=${encodeURIComponent(data.link)}&text=Join%20CryptoRealm%20and%20earn%20crypto!` }],
            [{ text: "🔙 Back", callback_data: "back" }],
          ],
        },
      }
    );
  } catch (err) {
    await ctx.answerCbQuery("Please start the bot first with /start");
  }
});

// Help
bot.action("help", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `*CryptoRealm: Help*\n\n` +
    `🎮 *How to Play:*\n` +
    `1. Get your free Guardian\n` +
    `2. Collect resources automatically\n` +
    `3. Upgrade and fuse Guardians\n` +
    `4. Withdraw VE to TON\n\n` +
    `⚡ *Void Energy (VE):* Sacable token\n` +
    `💎 *Crystal Shards (CS):* Upgrade currency\n\n` +
    `💰 *Withdrawals:*\n` +
    `• Min: 10 VE\n` +
    `• Fee: 5%\n` +
    `• Daily limit: 500 VE\n\n` +
    `🔗 *Links:*\n` +
    `• [Community](https://t.me/cryptorealm_chat)\n` +
    `• [Announcements](https://t.me/cryptorealm)`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎮 Play Now", web_app: { url: WEBAPP_URL } }],
          [{ text: "🔙 Back", callback_data: "back" }],
        ],
      },
    }
  );
});

// Back to main
bot.action("back", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `*CryptoRealm: Guardians of the Void*`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎮 Play Now", web_app: { url: WEBAPP_URL } }],
          [{ text: "📋 My Profile", callback_data: "profile" }],
          [{ text: "👥 Referrals", callback_data: "referrals" }],
          [{ text: "❓ Help", callback_data: "help" }],
        ],
      },
    }
  );
});

// Notify withdrawal approved
export async function notifyWithdrawalApproved(chatId: string, amount: number) {
  try {
    await bot.telegram.sendMessage(
      chatId,
      `✅ *Withdrawal Approved!*\n\n` +
      `${amount.toFixed(2)} VE has been sent to your TON wallet.\n\n` +
      `Check your wallet for the transfer.`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("Failed to send notification:", err);
  }
}

// Notify withdrawal rejected
export async function notifyWithdrawalRejected(chatId: string, amount: number, reason: string) {
  try {
    await bot.telegram.sendMessage(
      chatId,
      `❌ *Withdrawal Rejected*\n\n` +
      `Amount: ${amount.toFixed(2)} VE\n` +
      `Reason: ${reason}\n\n` +
      `Your VE has been refunded to your balance.`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("Failed to send notification:", err);
  }
}

// Launch bot
if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is required");
}

if (WEBHOOK_URL) {
  const hookPath = process.env.WEBHOOK_PATH || "/telegraf";
  const domain = normalizeBaseUrl(WEBHOOK_URL);
  const fullHookUrl = `${domain}${hookPath}`;

  bot.telegram.setWebhook(fullHookUrl).then(() => {
    const server = http.createServer(bot.webhookCallback(hookPath));
    server.listen(PORT, () => {
      console.log(`CryptoRealm Bot webhook listening on :${PORT} (${fullHookUrl})`);
    });
  });
} else {
  bot.launch().then(() => {
    console.log("CryptoRealm Bot running");
  });
}

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
