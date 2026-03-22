
import { PrismaClient } from '@prisma/client';

async function main() {
  // We need to bypass the custom loader if it's failing in this env
  // and just use a standard PrismaClient with the DATABASE_URL
  const prisma = new PrismaClient();
  
  try {
    const allItems = await prisma.contentPool.findMany({
      select: {
        id: true,
        type: true,
        audited: true,
        qualityScore: true
      }
    });
    
    console.log('--- Content Pool Overview ---');
    console.log('Total items:', allItems.length);
    
    const types = [...new Set(allItems.map((i: { type: string }) => i.type))] as string[];
    types.forEach((type: string) => {
      const items = allItems.filter((i: { type: string }) => i.type === type);
      const audited = items.filter((i: { audited: boolean }) => i.audited);
      const highScore = audited.filter((i: { qualityScore: number }) => i.qualityScore >= 5);
      console.log(`Type: ${type} | Total: ${items.length} | Audited: ${audited.length} | Score >= 5: ${highScore.length}`);
    });

    const preEmails = await prisma.contentPool.findMany({
      where: { type: 'EMAIL_PRE' },
      take: 5
    });
    
    console.log('\n--- EMAIL_PRE Samples ---');
    preEmails.forEach((item: { id: string; audited: boolean; qualityScore: number; data: unknown }, i: number) => {
      console.log(`\n[${i+1}] ID: ${item.id} | Audited: ${item.audited} | Score: ${item.qualityScore}`);
      console.log('Data:', JSON.stringify(item.data).slice(0, 200) + '...');
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error('Check script failed:', e);
  process.exit(1);
});
