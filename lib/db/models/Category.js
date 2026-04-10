import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // null for default categories
  },
  name: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
  },
  color: {
    type: String,
  },
  isCustom: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.models.Category || mongoose.model('Category', CategorySchema);
