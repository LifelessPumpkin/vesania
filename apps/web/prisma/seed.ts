import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  await prisma.user.upsert({
    where: { email: "logan3harmon@gmail.com" },
    update: {
      role: "ADMIN",
    },
    create: {
      email: "logan3harmon@gmail.com",
      username: "Greed",
      firebaseUid: "um77krZ6FUbTRW01PIKrQjyemVq2",
      role: "ADMIN",
    },
  });

  console.log("✅ Admin user ensured!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });