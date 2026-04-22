'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import ChatBot from '@/components/ChatBot';

export default function AddExpensePage() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    amount: '',
    category: 'Food',
    description: '',
    merchant: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(d => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error);
        return;
      }

      setSuccess(`Added ₹${parseFloat(form.amount).toFixed(2)} for ${form.category}`);
      setForm(f => ({ ...f, amount: '', description: '', merchant: '' }));
      window.dispatchEvent(new CustomEvent('expenseUpdated'));
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>Add Expense</h1>
            <p className="text-dim">Record a new transaction</p>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 600 }}>
          {success && (
            <div style={{
              background: 'var(--accent-green-soft)', border: '1px solid rgba(29,185,84,0.2)',
              borderRadius: 'var(--r-sm)', padding: '10px 14px', marginBottom: 16,
              color: 'var(--accent-green)', fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Check size={16} /> {success}
            </div>
          )}

          {error && <div className="error-message" style={{ marginBottom: 16 }}>{error}</div>}

          <form onSubmit={handleSubmit} id="add-expense-form">
            <div className="expense-form-grid">
              <div className="form-group">
                <label htmlFor="expense-amount">Amount (₹)</label>
                <input id="expense-amount" type="number" step="0.01" min="0" className="form-input"
                  placeholder="0.00" value={form.amount}
                  onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>

              <div className="form-group">
                <label htmlFor="expense-date">Date</label>
                <input id="expense-date" type="date" className="form-input" value={form.date}
                  onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} required />
              </div>

              <div className="form-group full-width">
                <label>Category</label>
                <div className="category-picker">
                  {categories.slice(0, 12).map(c => (
                    <div key={c.id || c._id}
                      className={`category-chip ${form.category === c.name ? 'selected' : ''}`}
                      onClick={() => setForm(f => ({ ...f, category: c.name }))}>
                      <span className="category-chip-icon">{c.icon}</span>
                      {c.name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="expense-desc">Description</label>
                <input id="expense-desc" type="text" className="form-input" placeholder="What was this for?"
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div className="form-group">
                <label htmlFor="expense-merchant">Merchant</label>
                <input id="expense-merchant" type="text" className="form-input" placeholder="Store name"
                  value={form.merchant}
                  onChange={(e) => setForm(f => ({ ...f, merchant: e.target.value }))} />
              </div>

              <div className="form-group">
                <label htmlFor="expense-payment">Payment</label>
                <select id="expense-payment" className="form-input" value={form.paymentMethod}
                  onChange={(e) => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                  <option value="cash">💵 Cash</option>
                  <option value="credit_card">💳 Credit Card</option>
                  <option value="debit_card">💳 Debit Card</option>
                  <option value="upi">📱 UPI</option>
                  <option value="bank_transfer">🏦 Bank Transfer</option>
                </select>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading} id="submit-expense-btn">
                  {loading ? <span className="loading-spinner" style={{ width: 20, height: 20 }}></span> : 'Add Expense'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
      <ChatBot />
    </div>
  );
}
