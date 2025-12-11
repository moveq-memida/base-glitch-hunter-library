const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('Testing database connection...');

    // Check if glitch with ID 1 exists
    const glitch1 = await prisma.glitch.findUnique({
      where: { id: 1 }
    });
    console.log('Glitch with ID 1:', glitch1);

    // Check if glitch with ID 2 exists
    const glitch2 = await prisma.glitch.findUnique({
      where: { id: 2 }
    });
    console.log('\nGlitch with ID 2:', glitch2);

    // Get all glitches
    const allGlitches = await prisma.glitch.findMany();
    console.log('\nTotal glitches in database:', allGlitches.length);
    console.log('\nAll glitches:', JSON.stringify(allGlitches, null, 2));

    await prisma.$disconnect();
  } catch (error) {
    console.error('Database error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testDatabase();
