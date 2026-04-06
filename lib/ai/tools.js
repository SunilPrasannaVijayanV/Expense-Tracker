import getDb from '@/lib/db/database';

// Helper: parse relative date strings to actual dates
function parseRelativeDate(dateStr) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (!dateStr) return today.toISOString().split('T')[0];
  
  const lower = dateStr.toLowerCase().trim();
  
  if (lower === 'today' || lower === 'now') {
    return today.toISOString().split('T')[0];
  }
  if (lower === 'yesterday') {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }
  if (lower === 'day before yesterday') {
    const d = new Date(today);
    d.setDate(d.getDate() - 2);
    return d.toISOString().split('T')[0];
  }
  
  // "X days ago"
  const daysAgoMatch = lower.match(/(\d+)\s*days?\s*ago/);
  if (daysAgoMatch) {
    const d = new Date(today);
    d.setDate(d.getDate() - parseInt(daysAgoMatch[1]));
    return d.toISOString().split('T')[0];
  }

  // Try to parse as a date string directly
  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {}

  return today.toISOString().split('T')[0];
}

// Helper: get date range for period strings
function getDateRange(period) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let startDate, endDate;

  switch (period?.toLowerCase()) {
    case 'today':
      startDate = endDate = today.toISOString().split('T')[0];
      break;
    case 'yesterday': {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      startDate = endDate = d.toISOString().split('T')[0];
      break;
    }
    case 'this week': {
      const d = new Date(today);
      d.setDate(d.getDate() - d.getDay());
      startDate = d.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
      break;
    }
    case 'last week': {
      const d = new Date(today);
      d.setDate(d.getDate() - d.getDay() - 7);
      startDate = d.toISOString().split('T')[0];
      const e = new Date(d);
      e.setDate(e.getDate() + 6);
      endDate = e.toISOString().split('T')[0];
      break;
    }
    case 'this month': {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
      break;
    }
    case 'last month': {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      break;
    }
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
  }

  return { startDate, endDate };
}

// Tool definitions for Gemini function calling
export const toolDeclarations = [
  {
    name: 'add_expense',
    description: 'Add one or more new expenses. Use this when the user mentions spending money, buying something, or paying for something.',
    parameters: {
      type: 'object',
      properties: {
        expenses: {
          type: 'array',
          description: 'Array of expenses to add',
          items: {
            type: 'object',
            properties: {
              amount: { type: 'number', description: 'The amount spent' },
              category: { type: 'string', description: 'Category: Food, Groceries, Transport, Entertainment, Bills, Shopping, Healthcare, Education, Travel, Coffee, Restaurants, Utilities, Rent, Subscriptions, Personal, Other' },
              description: { type: 'string', description: 'Brief description of the expense' },
              merchant: { type: 'string', description: 'Name of the store/vendor/merchant' },
              date: { type: 'string', description: 'Date of the expense. Use relative terms like "today", "yesterday", or ISO date format YYYY-MM-DD' },
              payment_method: { type: 'string', description: 'Payment method: cash, credit_card, debit_card, upi, bank_transfer' },
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
    description: 'Query and retrieve expenses. Use this when user asks about their spending, wants to see expenses, or needs spending information.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by category' },
        period: { type: 'string', description: 'Time period: today, yesterday, this week, last week, this month, last month' },
        start_date: { type: 'string', description: 'Start date YYYY-MM-DD' },
        end_date: { type: 'string', description: 'End date YYYY-MM-DD' },
        sort_by: { type: 'string', description: 'Sort by: amount, date' },
        sort_order: { type: 'string', description: 'Sort order: ASC, DESC' },
        limit: { type: 'number', description: 'Number of results to return' },
        search: { type: 'string', description: 'Search in description or merchant' },
      },
    },
  },
  {
    name: 'update_expense',
    description: 'Update/modify an existing expense. Use when user wants to change amount, category, or other details of an expense.',
    parameters: {
      type: 'object',
      properties: {
        expense_id: { type: 'number', description: 'The ID of the expense to update. If unknown, set to -1 to use the most recent expense.' },
        amount: { type: 'number', description: 'New amount' },
        category: { type: 'string', description: 'New category' },
        description: { type: 'string', description: 'New description' },
        merchant: { type: 'string', description: 'New merchant' },
        date: { type: 'string', description: 'New date' },
      },
      required: ['expense_id'],
    },
  },
  {
    name: 'delete_expense',
    description: 'Delete one or more expenses. Use when user wants to remove/delete expenses.',
    parameters: {
      type: 'object',
      properties: {
        expense_id: { type: 'number', description: 'ID of the expense to delete. Use -1 for most recent.' },
        category: { type: 'string', description: 'Delete all expenses in this category (within the period)' },
        period: { type: 'string', description: 'Time period for bulk delete: today, this week, this month' },
        confirm_bulk: { type: 'boolean', description: 'Set to false to request confirmation first. Set to true when user confirms.' },
      },
    },
  },
  {
    name: 'get_budget_status',
    description: 'Check budget status and progress. Use when user asks about budgets or if they are on track.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Optional specific category to check' },
      },
    },
  },
  {
    name: 'get_insights',
    description: 'Get spending insights. Use when user asks for analysis, insights, patterns, or recommendations about their spending.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Type of insight: spending_trends, category_comparison, month_comparison, top_expenses, recommendations',
        },
      },
    },
  },
  {
    name: 'get_category_summary',
    description: 'Get a summary of spending by category for a given period.',
    parameters: {
      type: 'object',
      properties: {
        period: { type: 'string', description: 'Time period: today, this week, this month, last month' },
      },
    },
  },
];

// Tool executors
export function executeToolCall(toolName, args, userId, lastExpenseIds) {
  const db = getDb();

  switch (toolName) {
    case 'add_expense':
      return executeAddExpense(db, args, userId);
    case 'get_expenses':
      return executeGetExpenses(db, args, userId);
    case 'update_expense':
      return executeUpdateExpense(db, args, userId, lastExpenseIds);
    case 'delete_expense':
      return executeDeleteExpense(db, args, userId, lastExpenseIds);
    case 'get_budget_status':
      return executeGetBudgetStatus(db, args, userId);
    case 'get_insights':
      return executeGetInsights(db, args, userId);
    case 'get_category_summary':
      return executeGetCategorySummary(db, args, userId);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

function executeAddExpense(db, args, userId) {
  const { expenses } = args;
  const insert = db.prepare(
    'INSERT INTO expenses (user_id, amount, category, description, merchant, date, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const results = [];
  const insertAll = db.transaction(() => {
    for (const exp of expenses) {
      const date = parseRelativeDate(exp.date);
      const result = insert.run(
        userId, exp.amount, exp.category, exp.description || null,
        exp.merchant || null, date, exp.payment_method || 'cash'
      );
      results.push({
        id: Number(result.lastInsertRowid),
        amount: exp.amount,
        category: exp.category,
        description: exp.description,
        merchant: exp.merchant,
        date,
      });
    }
  });

  insertAll();
  const total = results.reduce((sum, e) => sum + e.amount, 0);

  return {
    success: true,
    message: `Added ${results.length} expense(s) totaling $${total.toFixed(2)}`,
    expenses: results,
    newExpenseIds: results.map(r => r.id),
  };
}

function executeGetExpenses(db, args, userId) {
  let where = ['user_id = ?'];
  let params = [userId];

  if (args.category) { where.push('category = ?'); params.push(args.category); }
  
  if (args.period) {
    const { startDate, endDate } = getDateRange(args.period);
    where.push('date >= ? AND date <= ?');
    params.push(startDate, endDate);
  } else {
    if (args.start_date) { where.push('date >= ?'); params.push(args.start_date); }
    if (args.end_date) { where.push('date <= ?'); params.push(args.end_date); }
  }

  if (args.search) {
    where.push('(description LIKE ? OR merchant LIKE ?)');
    params.push(`%${args.search}%`, `%${args.search}%`);
  }

  const sortBy = args.sort_by === 'amount' ? 'amount' : 'date';
  const sortOrder = args.sort_order === 'ASC' ? 'ASC' : 'DESC';
  const limit = args.limit || 20;

  const whereClause = where.join(' AND ');
  const expenses = db.prepare(
    `SELECT * FROM expenses WHERE ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ?`
  ).all(...params, limit);

  const totalResult = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM expenses WHERE ${whereClause}`
  ).get(...params);

  return {
    expenses,
    total: totalResult.total,
    count: totalResult.count,
  };
}

function executeUpdateExpense(db, args, userId, lastExpenseIds) {
  let expenseId = args.expense_id;

  // If -1, use most recent expense
  if (expenseId === -1 || expenseId === undefined) {
    if (lastExpenseIds && lastExpenseIds.length > 0) {
      expenseId = lastExpenseIds[lastExpenseIds.length - 1];
    } else {
      const recent = db.prepare('SELECT id FROM expenses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId);
      if (recent) expenseId = recent.id;
      else return { error: 'No expenses found to update' };
    }
  }

  const existing = db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?').get(expenseId, userId);
  if (!existing) return { error: 'Expense not found' };

  const updates = {};
  if (args.amount !== undefined) updates.amount = args.amount;
  if (args.category) updates.category = args.category;
  if (args.description) updates.description = args.description;
  if (args.merchant) updates.merchant = args.merchant;
  if (args.date) updates.date = parseRelativeDate(args.date);

  const fields = Object.keys(updates);
  if (fields.length === 0) return { error: 'No updates specified' };

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => updates[f]);

  db.prepare(`UPDATE expenses SET ${setClause} WHERE id = ? AND user_id = ?`).run(...values, expenseId, userId);

  const updated = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
  
  return {
    success: true,
    message: `Updated expense #${expenseId}`,
    previous: existing,
    updated,
  };
}

function executeDeleteExpense(db, args, userId, lastExpenseIds) {
  // Single expense delete
  if (args.expense_id && args.expense_id !== -1) {
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?').get(args.expense_id, userId);
    if (!expense) return { error: 'Expense not found' };

    db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?').run(args.expense_id, userId);
    return {
      success: true,
      message: `Deleted $${expense.amount} ${expense.category} expense`,
      deleted: [expense],
    };
  }

  // Delete most recent
  if (args.expense_id === -1) {
    let expenseId;
    if (lastExpenseIds && lastExpenseIds.length > 0) {
      expenseId = lastExpenseIds[lastExpenseIds.length - 1];
    } else {
      const recent = db.prepare('SELECT id FROM expenses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId);
      if (recent) expenseId = recent.id;
      else return { error: 'No expenses found to delete' };
    }

    const expense = db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?').get(expenseId, userId);
    if (!expense) return { error: 'Expense not found' };

    db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?').run(expenseId, userId);
    return {
      success: true,
      message: `Deleted $${expense.amount} ${expense.category} expense`,
      deleted: [expense],
    };
  }

  // Bulk delete by category + period
  if (args.category && args.period) {
    const { startDate, endDate } = getDateRange(args.period);
    
    const toDelete = db.prepare(
      'SELECT * FROM expenses WHERE user_id = ? AND category = ? AND date >= ? AND date <= ?'
    ).all(userId, args.category, startDate, endDate);

    if (toDelete.length === 0) {
      return { message: `No ${args.category} expenses found for ${args.period}` };
    }

    if (!args.confirm_bulk) {
      return {
        needs_confirmation: true,
        message: `Found ${toDelete.length} ${args.category} expenses totaling $${toDelete.reduce((s, e) => s + e.amount, 0).toFixed(2)}. Please confirm deletion.`,
        expenses: toDelete,
      };
    }

    db.prepare(
      'DELETE FROM expenses WHERE user_id = ? AND category = ? AND date >= ? AND date <= ?'
    ).run(userId, args.category, startDate, endDate);

    return {
      success: true,
      message: `Deleted ${toDelete.length} ${args.category} expenses totaling $${toDelete.reduce((s, e) => s + e.amount, 0).toFixed(2)}`,
      deleted: toDelete,
    };
  }

  return { error: 'Please specify which expense(s) to delete' };
}

function executeGetBudgetStatus(db, args, userId) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  let budgetQuery = 'SELECT * FROM budgets WHERE user_id = ? AND month = ?';
  let budgetParams = [userId, currentMonth];

  if (args.category) {
    budgetQuery += ' AND category = ?';
    budgetParams.push(args.category);
  }

  const budgets = db.prepare(budgetQuery).all(...budgetParams);

  if (budgets.length === 0) {
    return { message: 'No budgets set for this month. You can set budgets on the Budgets page.' };
  }

  const spending = db.prepare(
    'SELECT category, SUM(amount) as total FROM expenses WHERE user_id = ? AND date >= ? AND date <= ? GROUP BY category'
  ).all(userId, monthStart, monthEnd);

  const status = budgets.map(b => {
    const spent = spending.find(s => s.category === b.category);
    const spentAmount = spent ? spent.total : 0;
    const percentage = Math.round((spentAmount / b.amount) * 100);
    let statusText = 'On track';
    if (percentage >= 100) statusText = 'Over budget!';
    else if (percentage >= 80) statusText = 'Approaching limit';
    else if (percentage >= 50) statusText = 'Halfway there';

    return {
      category: b.category,
      budget: b.amount,
      spent: spentAmount,
      remaining: b.amount - spentAmount,
      percentage,
      status: statusText,
    };
  });

  return { budgetStatus: status };
}

function executeGetInsights(db, args, userId) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

  // This month spending by category
  const thisMonth = db.prepare(
    'SELECT category, SUM(amount) as total, COUNT(*) as count FROM expenses WHERE user_id = ? AND date >= ? AND date <= ? GROUP BY category ORDER BY total DESC'
  ).all(userId, monthStart, monthEnd);

  const lastMonth = db.prepare(
    'SELECT category, SUM(amount) as total FROM expenses WHERE user_id = ? AND date >= ? AND date <= ? GROUP BY category'
  ).all(userId, lastMonthStart, lastMonthEnd);

  const thisMonthTotal = thisMonth.reduce((s, c) => s + c.total, 0);
  const lastMonthTotal = lastMonth.reduce((s, c) => s + c.total, 0);

  // Category comparison
  const categoryChanges = thisMonth.map(t => {
    const prev = lastMonth.find(l => l.category === t.category);
    const prevTotal = prev ? prev.total : 0;
    const change = prevTotal > 0 ? (((t.total - prevTotal) / prevTotal) * 100).toFixed(1) : 'new';
    return { category: t.category, thisMonth: t.total, lastMonth: prevTotal, change: change + '%', count: t.count };
  });

  // Top 5 expenses this month
  const topExpenses = db.prepare(
    'SELECT * FROM expenses WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY amount DESC LIMIT 5'
  ).all(userId, monthStart, monthEnd);

  // Daily average
  const daysPassed = now.getDate();
  const dailyAvg = daysPassed > 0 ? (thisMonthTotal / daysPassed).toFixed(2) : 0;

  return {
    thisMonthTotal,
    lastMonthTotal,
    monthlyChange: lastMonthTotal > 0 ? (((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1) + '%' : 'N/A',
    dailyAverage: dailyAvg,
    topCategory: thisMonth[0] || null,
    categoryBreakdown: categoryChanges,
    topExpenses,
  };
}

function executeGetCategorySummary(db, args, userId) {
  const { startDate, endDate } = getDateRange(args.period || 'this month');
  
  const summary = db.prepare(
    'SELECT category, SUM(amount) as total, COUNT(*) as count FROM expenses WHERE user_id = ? AND date >= ? AND date <= ? GROUP BY category ORDER BY total DESC'
  ).all(userId, startDate, endDate);

  const grandTotal = summary.reduce((s, c) => s + c.total, 0);

  return {
    period: args.period || 'this month',
    categories: summary.map(s => ({
      ...s,
      percentage: grandTotal > 0 ? ((s.total / grandTotal) * 100).toFixed(1) + '%' : '0%',
    })),
    grandTotal,
  };
}
