import dbConnect from './lib/db/mongodb.js';
import Category from './lib/db/models/Category.js';
import { seedCategories } from './lib/db/seed.js';

async function test() {
  try {
    console.log('⏳ Connecting to MongoDB...');
    await dbConnect();
    console.log('✅ Connected successfully!');

    await seedCategories();
    
    const categories = await Category.find({ userId: null });
    console.log(`📊 Found ${categories.length} default categories in MongoDB.`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB Test Failed:', error);
    process.exit(1);
  }
}

test();
