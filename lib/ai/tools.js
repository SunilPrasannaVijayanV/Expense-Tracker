import dbConnect from '../db/mongodb';
import Expense from '../db/models/Expense';
import Budget from '../db/models/Budget';
import Category from '../db/models/Category';
import mongoose from 'mongoose';

export const toolDeclarations = [
  {
    name: 'add_expense',
    description: 'Add one or more new expenses to the database. Each expense must have an amount, category, and date.',
    parameters: {
      type: 'object',
      properties: {
        expenses: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              amount: { type: 'number', description: 'The cost amount' },
              category: { type: 'string', description: 'Expense category (Food, Groceries, etc.)' },
              description: { type: 'string', description: 'Note about the expense' },
              merchant: { type: 'string', description: 'Where the money was spent' },
              date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
              paymentMethod: { type: 'string', description: 'cash, credit card, etc.' },
            },
            required: ['amount', 'category', 'date'],
          },
        },
      },
      required: ['expenses'],
    },
  },
  {
    name: 'get_expenses',
    description: 'Query the expense database with filters. Returns a list of matching expenses and a total.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string' },
        startDate: { type: 'string', description: 'Format YYYY-MM-DD' },
        endDate: { type: 'string', description: 'Format YYYY-MM-DD' },
        search: { type: 'string', description: 'Search in description or merchant' },
        limit: { type: 'number', default: 10 },
      },
    },
  },
  {
    name: 'update_expense',
    description: 'Update an existing expense by its unique ID. Use get_expenses first to find the ID.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The MongoDB ObjectId of the expense' },
        updates: {
          type: 'object',
          properties: {
            amount: { type: 'number' },
            category: { type: 'string' },
            description: { type: 'string' },
            merchant: { type: 'string' },
            date: { type: 'string' },
            paymentMethod: { type: 'string' },
          },
        },
      },
      required: ['id', 'updates'],
    },
  },
  {
    name: 'delete_expense',
    description: 'Remove one or more expenses. For multiple, list their IDs.',
    parameters: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string' }, description: 'List of MongoDB ObjectIds' },
      },
      required: ['ids'],
    },
  },
  {
    name: 'get_category_summary',
    description: 'Get total spending grouped by category for a specific month.',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'string', description: 'Format YYYY-MM. Defaults to current month if omitted.' },
      },
    },
  },
  {
    name: 'get_budget_status',
    description: 'Check how much budget is left for categories in a specific month.',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'string', description: 'Format YYYY-MM' },
      },
    },
  },
];

export async function executeToolCall(name, args, userId, allNewExpenseIds = []) {
  await dbConnect();

  switch (name) {
    case 'add_expense': {
      try {
        const docs = await Expense.insertMany(
          args.expenses.map(exp => ({ ...exp, userId }))
        );
        const expenses = docs.map(d => ({ ...d.toObject(), id: d._id.toString() }));
        const newIds = expenses.map(e => e.id);
        
        // Update the tracking array for "update that" context
        allNewExpenseIds.push(...newIds);
        
        return {
          success: true,
          message: `Successfully added ${expenses.length} expense(s).`,
          expenses,
          newExpenseIds: newIds
        };
      } catch (err) {
        return { error: err.message };
      }
    }

    case 'get_expenses': {
      const { category, startDate, endDate, search, limit = 10 } = args;
      const query = { userId };
      if (category && category !== 'All') query.category = category;
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = startDate;
        if (endDate) query.date.$lte = endDate;
      }
      if (search) {
        query.$or = [
          { description: { $regex: search, $options: 'i' } },
          { merchant: { $regex: search, $options: 'i' } }
        ];
      }
      
      const expenses = await Expense.find(query).sort({ date: -1 }).limit(limit);
      const totalResult = await Expense.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]);
      
      return {
        expenses,
        total: totalResult[0]?.total || 0,
        count: totalResult[0]?.count || 0,
      };
    }

    case 'update_expense': {
        const { id, updates } = args;
        const targetId = id === "-1" ? allNewExpenseIds[allNewExpenseIds.length - 1] : id;
        
        if (!targetId) return { error: "No expense ID provided or no recent expense found to update." };
        
        try {
            const updated = await Expense.findOneAndUpdate(
                { _id: targetId, userId },
                { $set: updates },
                { new: true }
            );
            if (!updated) return { error: "Expense not found. It might have been deleted or doesn't belong to you." };
            
            const result = { ...updated.toObject(), id: updated._id.toString() };
            return { success: true, message: "Expense updated successfully.", expense: result };
        } catch (err) {
            return { error: err.message };
        }
    }

    case 'delete_expense': {
        const { ids } = args;
        const targetIds = ids.map(id => id === "-1" ? allNewExpenseIds[allNewExpenseIds.length - 1] : id).filter(Boolean);
        
        try {
            const result = await Expense.deleteMany({ _id: { $in: targetIds }, userId });
            return { success: true, message: `Deleted ${result.deletedCount} expense(s).` };
        } catch (err) {
            return { error: err.message };
        }
    }

    case 'get_category_summary': {
        const month = args.month || new Date().toISOString().slice(0, 7);
        const summary = await Expense.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId), date: { $regex: `^${month}` } } },
            { $group: { _id: '$category', total: { $sum: '$amount' } } },
            { $project: { category: '$_id', total: 1, _id: 0 } },
            { $sort: { total: -1 } }
        ]);
        return { month, summary };
    }

    case 'get_budget_status': {
        const month = args.month || new Date().toISOString().slice(0, 7);
        const budgets = await Budget.find({ userId, month });
        const summary = await Expense.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId), date: { $regex: `^${month}` } } },
            { $group: { _id: '$category', total: { $sum: '$amount' } } }
        ]);
        
        const status = budgets.map(b => {
            const spent = summary.find(s => s._id === b.category)?.total || 0;
            return {
                category: b.category,
                budget: b.amount,
                spent,
                remaining: b.amount - spent,
                percentage: (spent / b.amount) * 100
            };
        });
        return { month, status };
    }

    default:
      return { error: `Tool ${name} not implemented.` };
  }
}
