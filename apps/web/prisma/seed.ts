import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  const user = await prisma.user.findFirst({ where: { email: "logan3harmon@gmail.com" } });
  const emberDefId = "def-ember";
  const tideDefId = "def-tide";

  // ------------------
  // CardDefinitions
  // ------------------
  // await prisma.cardDefinition.upsert({
  //   where: { id: emberDefId },
  //   update: {},
  //   create: {
  //     id: emberDefId,
  //     name: "Ember",
  //     type: "CHARACTER",
  //     rarity: "COMMON",
  //     description: "A fiery character with moderate health and energy.",
  //     effectJson: { health: 70, energy: 4 },
  //   },
  // });

  // await prisma.cardDefinition.upsert({
  //   where: { id: tideDefId },
  //   update: {},
  //   create: {
  //     id: tideDefId,
  //     name: "Tide",
  //     type: "CHARACTER",
  //     rarity: "COMMON",
  //     description: "A water-based character with high health and steady energy.",
  //     effectJson: { health: 80, energy: 4 },
  //   },
  // });

  // // ------------------
  // // NFC Cards
  // // ------------------
  // await prisma.card.upsert({
  //   where: { publicCode: "PUB12345" }, // best unique lookup for NFC cards
  //   update: {},
  //   create: {
  //     publicCode: "PUB12345",
  //     claimedAt: new Date(),
  //     owner: { connect: { id: user?.id } },              // relation connect
  //     definition: { connect: { id: emberDefId } },      // relation connect
  //   },
  // });

  // await prisma.card.upsert({
  //   where: { publicCode: "PUB67890" },
  //   update: {},
  //   create: {
  //     publicCode: "PUB67890",
  //     claimedAt: new Date(),
  //     owner: { connect: { id: user?.id } },
  //     definition: { connect: { id: tideDefId } },
  //   },
  // });

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });