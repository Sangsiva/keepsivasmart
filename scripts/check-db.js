const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const modules = await prisma.learningModule.findMany();
  console.log('Modules:', modules.map(m => ({ id: m.id, title: m.title, progressSeconds: m.progressSeconds })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
