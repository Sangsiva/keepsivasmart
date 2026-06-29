import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fetchModules() {
  const modules = await prisma.learningModule.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true
    }
  });
  
  console.log(JSON.stringify(modules, null, 2));
}

fetchModules().catch(console.error).finally(() => prisma.$disconnect());
