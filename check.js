const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const oees = await prisma.oeeSummary.findMany();
    console.log(oees);
}
main().finally(() => prisma.$disconnect());
