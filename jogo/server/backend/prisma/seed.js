"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    // Create demo players
    const players = [
        { telegramId: "100001", username: "void_farmer_42", referralCode: "VOID42", veBalance: 45.20, csBalance: 12500 },
        { telegramId: "100002", username: "crypto_hunter", referralCode: "HUNT99", veBalance: 230.00, csBalance: 45000 },
        { telegramId: "100003", username: "guardian_master", referralCode: "MSTR3", veBalance: 18.50, csBalance: 8200 },
        { telegramId: "100004", username: "shard_collector", referralCode: "SHARD7", veBalance: 85.00, csBalance: 22000, riskScore: 65 },
        { telegramId: "100005", username: "ton_whale_99", referralCode: "WHALE9", veBalance: 580.00, csBalance: 95000, riskScore: 78 },
    ];
    for (const data of players) {
        const player = await prisma.player.create({ data });
        // Add guardians
        const guardians = [
            { name: "Aether Sprite", rarity: "common", level: 5, farmingPower: 1.8, vePerHour: 0.14, csPerHour: 21 },
            { name: "Storm Sentinel", rarity: "rare", level: 3, farmingPower: 3.0, vePerHour: 0.45, csPerHour: 68 },
        ];
        for (const g of guardians) {
            await prisma.guardian.create({ data: { ...g, playerId: player.id } });
        }
    }
    console.log("Seed completed");
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map