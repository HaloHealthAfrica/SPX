// Note: This script requires Node.js 18+ for built-in fetch
// Or run: curl -X POST http://localhost:3000/api/dev/seed

async function seed() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/dev/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Seed data created successfully!');
      console.log('Counts:', data.counts);
    } else {
      console.error('❌ Seed failed:', data.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    console.log('\n💡 Tip: Make sure the dev server is running (npm run dev)');
    process.exit(1);
  }
}

seed();

