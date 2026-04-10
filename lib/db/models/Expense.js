import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  subcategory: {
    type: String,
  },
  description: {
    type: String,
  },
  merchant: {
    type: String,
  },
  date: {
    type: String,
    required: true,
  },
  paymentMethod: {
    type: String,
    default: 'cash',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
