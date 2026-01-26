import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // ------------------
  // USERS
  // ------------------
  const logan = await prisma.user.upsert({
    where: { username: "logan" },
    update: {},
    create: { username: "logan" },
  });

  const chase = await prisma.user.upsert({
    where: { username: "chase" },
    update: {},
    create: { username: "chase" },
  });

  const greg = await prisma.user.upsert({
    where: { username: "greg" },
    update: {},
    create: { username: "greg" },
  });

  const zach = await prisma.user.upsert({
    where: { username: "zach" },
    update: {},
    create: { username: "zach" },
  });

  const gio = await prisma.user.upsert({
    where: { username: "gio" },
    update: {},
    create: { username: "gio" },
  });

  const laura = await prisma.user.upsert({
    where: { username: "laura" },
    update: {},
    create: { username: "laura" },
  });

  // ------------------
  // CHARACTERS
  // ------------------
  // const ember = await prisma.character.upsert({
  //   where: { id: "char_ember" },
  //   update: {},
  //   create: {
  //     id: "char_ember",
  //     name: "Ember",
  //     archetype: "Pyromancer",
  //     description: "A glass-cannon mage that snowballs burn damage.",
  //   },
  // });

  // const tide = await prisma.character.upsert({
  //   where: { id: "char_tide" },
  //   update: {},
  //   create: {
  //     id: "char_tide",
  //     name: "Tide",
  //     archetype: "Defender",
  //     description: "A tanky brawler focused on block and control.",
  //   },
  // });

  // ------------------
  // ITEMS / CARDS
  // ------------------
  // await prisma.item.createMany({
  //   data: [
  //     // Ember cards
  //     {
  //       characterId: ember.id,
  //       name: "Cinder Shot",
  //       cost: 1,
  //       rarity: "Common",
  //       effectJson: { type: "damage", amount: 6 },
  //     },
  //     {
  //       characterId: ember.id,
  //       name: "Flame Surge",
  //       cost: 2,
  //       rarity: "Uncommon",
  //       effectJson: { type: "damage_all", amount: 4, burn: 2 },
  //     },
  //     {
  //       characterId: ember.id,
  //       name: "Burning Focus",
  //       cost: 1,
  //       rarity: "Common",
  //       effectJson: { type: "buff", stat: "spellPower", amount: 2 },
  //     },

  //     // Tide cards
  //     {
  //       characterId: tide.id,
  //       name: "Ice Mace",
  //       cost: 1,
  //       rarity: "Common",
  //       effectJson: { type: "damage", amount: 5 },
  //     },
  //     {
  //       characterId: tide.id,
  //       name: "Glacial Guard",
  //       cost: 1,
  //       rarity: "Common",
  //       effectJson: { type: "block", amount: 7 },
  //     },
  //     {
  //       characterId: tide.id,
  //       name: "Frozen Slam",
  //       cost: 2,
  //       rarity: "Uncommon",
  //       effectJson: { type: "damage", amount: 8, slow: 1 },
  //     },
  //   ],
  //   skipDuplicates: true,
  // });

  // ------------------
  // NFC CARDS
  // ------------------
  // const card1 = await prisma.card.upsert({
  //   where: { publicCode: "SC-EMBER-0001" },
  //   update: {},
  //   create: {
  //     publicCode: "SC-EMBER-0001",
  //     status: "CLAIMED",
  //     ownerId: logan.id,
  //   },
  // });

  // const card2 = await prisma.card.upsert({
  //   where: { publicCode: "SC-TIDE-0001" },
  //   update: {},
  //   create: {
  //     publicCode: "SC-TIDE-0001",
  //     status: "UNCLAIMED",
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