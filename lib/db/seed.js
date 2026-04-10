import dbConnect from './mongodb.js';
import Category from './models/Category.js';

const defaultCategories = [
  { name: 'Food', icon: '🍕', color: '#FF6B6B' },
  { name: 'Groceries', icon: '🛒', color: '#4ECDC4' },
  { name: 'Transport', icon: '🚗', color: '#45B7D1' },
  { name: 'Entertainment', icon: '🎬', color: '#96CEB4' },
  { name: 'Bills', icon: '📄', color: '#FFEAA7' },
  { name: 'Shopping', icon: '🛍️', color: '#DDA0DD' },
  { name: 'Healthcare', icon: '🏥', color: '#98D8C8' },
  { name: 'Education', icon: '📚', color: '#F7DC6F' },
  { name: 'Travel', icon: '✈️', color: '#BB8FCE' },
  { name: 'Coffee', icon: '☕', color: '#D4A574' },
  { name: 'Restaurants', icon: '🍽️', color: '#FF8A65' },
  { name: 'Utilities', icon: '💡', color: '#FFD93D' },
  { name: 'Rent', icon: '🏠', color: '#6C5CE7' },
  { name: 'Subscriptions', icon: '📱', color: '#A29BFE' },
  { name: 'Personal', icon: '👤', color: '#FD79A8' },
  { name: 'Other', icon: '📦', color: '#B2BEC3' },
];

export async function seedCategories() {
  await dbConnect();
  
  const count = await Category.countDocuments({ userId: null });
  if (count === 0) {
    console.log('🌱 Seeding default categories...');
    await Category.insertMany(defaultCategories);
    console.log('✅ Categories seeded!');
  }
}
