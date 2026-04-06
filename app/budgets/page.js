'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import ChatBot from '@/components/ChatBot';

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: '', amount: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [budgetRes, catRes] = await Promise.all([
        fetch('/api/budgets'),
        fetch('/api/categories'),
      ]);
      if (budgetRes.status === 401) { window.location.href = '/login'; return; }
      const budgetData = await budgetRes.json();
      const catData = await catRes.json();
      setBudgets(budgetData.budgets || []);
      setCategories(catData.categories || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const handler = () => fetchData();
    window.addEventListener('expenseUpdated', handler);
    return () => window.removeEventListener('expenseUpdated', handler);
  }, [fetchData]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.category || !form.amount) return;
    setSaving(true);
    try {
      await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm({ category: '', amount: '' });
      fetchData();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this budget?')) return;
    await fetch(`/api/budgets?id=${id}`, { method: 'DELETE' });
    fetchData();
  };

  const usedCategories = budgets.map(b => b.category);
  const availableCategories = categories.filter(c => !usedCategories.includes(c.name));

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>Budget Management</h1>
            <p>Set and track monthly budgets by category</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)} id="add-budget-btn">
            <Plus size={18} /> Set Budget
          </button>
        </div>

        {/* Add Budget Modal */}
        {showForm && (
          <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <div className="modal">
              <h2>Set Monthly Budget</h2>
              <form onSubmit={handleSave}>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label>Category</label>
                  <select className="form-input" value={form.category}
                    onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} required id="budget-category">
                    <option value="">Select category</option>
                    {availableCategories.map(c => (
                      <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Budget Amount ($)</label>
                  <input type="number" step="0.01" min="1" className="form-input" placeholder="500.00"
                    value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                    required id="budget-amount" />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <span className="loading-spinner"></span> : 'Save Budget'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Budget List */}
        {loading ? (
          <div className="flex-center" style={{ height: '40vh' }}>
            <div className="loading-spinner" style={{ width: 36, height: 36 }}></div>
          </div>
        ) : budgets.length > 0 ? (
          <div style={{ display: 'grid', gap: 16 }}>
            {budgets.map(b => {
              const pct = Math.min(b.percentage, 100);
              const status = b.percentage >= 100 ? 'danger' : b.percentage >= 75 ? 'warning' : 'safe';
              const catInfo = categories.find(c => c.name === b.category);

              return (
                <div key={b.id} className="budget-card">
                  <div className="budget-header">
                    <span className="budget-category">
                      <span style={{ fontSize: '1.25rem' }}>{catInfo?.icon || '📁'}</span>
                      {b.category}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div className="budget-amounts">
                        <span className="spent">${Number(b.spent).toFixed(2)}</span> / ${Number(b.amount).toFixed(2)}
                      </div>
                      <button className="btn-icon" style={{ width: 32, height: 32, color: 'var(--accent-danger)' }}
                        onClick={() => handleDelete(b.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="budget-progress">
                    <div className={`budget-progress-bar ${status}`} style={{ width: `${pct}%` }}></div>
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', marginTop: 8,
                    fontSize: '0.8rem', color: 'var(--text-muted)',
                  }}>
                    <span>{b.percentage}% used</span>
                    <span style={{
                      color: status === 'danger' ? 'var(--accent-danger)' : status === 'warning' ? 'var(--accent-warning)' : 'var(--accent-secondary)',
                      fontWeight: 600,
                    }}>
                      {b.percentage >= 100 ? '⚠️ Over budget!' : b.percentage >= 75 ? '⚠️ Approaching limit' : '✅ On track'}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Summary Card */}
            <div className="card" style={{ marginTop: 8 }}>
              <div className="card-header">
                <span className="card-title">Budget Summary</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Total Budget</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    ${budgets.reduce((s, b) => s + b.amount, 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Total Spent</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-danger)' }}>
                    ${budgets.reduce((s, b) => s + b.spent, 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Remaining</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                    ${(budgets.reduce((s, b) => s + b.amount, 0) - budgets.reduce((s, b) => s + b.spent, 0)).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">🎯</div>
              <h3>No budgets set</h3>
              <p>Create monthly budgets to track your spending by category</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowForm(true)}>
                <Plus size={18} /> Set Your First Budget
              </button>
            </div>
          </div>
        )}
      </main>
      <ChatBot />
    </div>
  );
}
