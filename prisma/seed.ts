import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...');

  // ── 1. Upsert roles ───────────────────────────────────────────────────────
  const adminRole = await prisma.role.upsert({
    where: { key: 'ADMIN' },
    update: {},
    create: { key: 'ADMIN', name: 'Administrador' },
  });

  const userRole = await prisma.role.upsert({
    where: { key: 'USER' },
    update: {},
    create: { key: 'USER', name: 'Usuario' },
  });

  console.log('✅ Roles created:', adminRole.key, userRole.key);

  // ── 2. Map emails → roles ─────────────────────────────────────────────────
  const userSeed: { email: string; roleId: string }[] = [
    { email: 'csullcap@unsa.edu.pe', roleId: adminRole.id },
    { email: 'christiandsp28@gmail.com', roleId: userRole.id },
  ];

  for (const { email, roleId } of userSeed) {
    // Look up the Supabase auth user by email (raw query against auth schema)
    const result = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM auth.users WHERE email = ${email} LIMIT 1
    `;

    if (result.length === 0) {
      console.log(`⚠️  User "${email}" not found in auth.users — skipping.`);
      continue;
    }

    const userId = result[0].id;

    // Upsert profile
    await prisma.profile.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId },
    });

    // Upsert user_role
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: {},
      create: { userId, roleId },
    });

    console.log(`✅  Assigned role to "${email}"`);
  }

  console.log('🎉 Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
