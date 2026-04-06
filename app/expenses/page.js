'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, Edit3, ChevronLeft, ChevronRight, Download, ChevronDown, FileText, FileSpreadsheet } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import ChatBot from '@/components/ChatBot';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '', search: '', startDate: '', endDate: '',
    sortBy: 'date', sortOrder: 'DESC', paymentMethod: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [categories, setCategories] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const fetchExpenses = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });

      const res = await fetch(`/api/expenses?${params}`);
      if (res.status === 401) { window.location.href = '/login'; return; }
      const data = await res.json();
      setExpenses(data.expenses || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchExpenses();
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(d.categories || []));
    const handler = () => fetchExpenses();
    window.addEventListener('expenseUpdated', handler);
    return () => window.removeEventListener('expenseUpdated', handler);
  }, [fetchExpenses]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    fetchExpenses(pagination.page);
    window.dispatchEvent(new CustomEvent('expenseUpdated'));
  };

  const handleEdit = (exp) => {
    setEditingId(exp.id);
    setEditData({ amount: exp.amount, category: exp.category, description: exp.description, merchant: exp.merchant, date: exp.date });
  };

  const handleSave = async (id) => {
    await fetch(`/api/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
    });
    setEditingId(null);
    fetchExpenses(pagination.page);
    window.dispatchEvent(new CustomEvent('expenseUpdated'));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    setExportLoading(true);
    setExportDropdownOpen(false);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await fetch(`/api/expenses/export?${params}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExportLoading(true);
    setExportDropdownOpen(false);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      params.set('limit', '9999');
      const res = await fetch(`/api/expenses?${params}`);
      if (!res.ok) throw new Error('Failed to fetch expenses');
      const data = await res.json();
      const rows = data.expenses || [];
      const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
      const totalAmount = rows.reduce((s, e) => s + Number(e.amount), 0).toFixed(2);

      const tableRows = rows.map(e => `
        <tr>
          <td>${e.date}</td>
          <td>${e.description || '—'}</td>
          <td><span class="badge">${e.category}</span></td>
          <td>${e.merchant || '—'}</td>
          <td style="text-transform:capitalize">${(e.payment_method || 'cash').replace(/_/g, ' ')}</td>
          <td class="amount">$${Number(e.amount).toFixed(2)}</td>
        </tr>`).join('');

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Expense Report — ${today}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 2px solid #6C63FF; padding-bottom: 16px; }
    .header h1 { font-size: 24px; color: #6C63FF; }
    .header p { font-size: 12px; color: #666; margin-top: 4px; }
    .meta { text-align: right; font-size: 12px; color: #555; }
    .meta strong { font-size: 18px; color: #1a1a2e; display: block; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead tr { background: #6C63FF; color: white; }
    thead th { padding: 10px 12px; text-align: left; font-weight: 600; }
    tbody tr:nth-child(even) { background: #f4f4fb; }
    tbody td { padding: 9px 12px; border-bottom: 1px solid #e8e8f0; }
    .badge { background: #ede9fe; color: #6C63FF; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .amount { font-weight: 700; color: #e53e3e; }
    .footer { margin-top: 20px; text-align: right; font-size: 14px; }
    .footer strong { color: #e53e3e; font-size: 18px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div><h1>💰 Expense Report</h1><p>Generated on ${today}</p></div>
    <div class="meta">Total Expenses<strong>$${totalAmount}</strong>${rows.length} transactions</div>
  </div>
  <table>
    <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Merchant</th><th>Payment</th><th>Amount</th></tr></thead>
    <tbody>${tableRows || '<tr><td colspan="6" style="text-align:center;padding:24px;color:#999">No expenses found</td></tr>'}</tbody>
  </table>
  <div class="footer">Total: <strong>$${totalAmount}</strong></div>
</body>
</html>`;

      const win = window.open('', '_blank');
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('PDF export failed. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>Transaction History</h1>
            <p>{pagination.total} total expenses</p>
          </div>
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setExportDropdownOpen(o => !o)}
              disabled={exportLoading}
              id="export-btn"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Download size={16} />
              {exportLoading ? 'Exporting...' : 'Export'}
              <ChevronDown size={14} />
            </button>
            {exportDropdownOpen && (
              <div style={{
                position: 'absolute', top: '110%', right: 0, zIndex: 100,
                background: 'var(--surface-2, #1e1e30)', border: '1px solid var(--border-color)',
                borderRadius: 10, overflow: 'hidden', minWidth: 170, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                <button id="export-csv-btn" onClick={handleExport} style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '11px 16px', background: 'none', border: 'none',
                  color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.875rem',
                }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.12)'}
                   onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <FileSpreadsheet size={15} style={{ color: '#00D4AA' }} />
                  Export as CSV
                </button>
                <button id="export-pdf-btn" onClick={handleExportPDF} style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '11px 16px', background: 'none', border: 'none',
                  color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.875rem',
                }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.12)'}
                   onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <FileText size={15} style={{ color: '#FF6B6B' }} />
                  Export as PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="filter-input"
              placeholder="Search expenses..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={{ paddingLeft: 36, width: '100%' }}
              id="filter-search"
            />
          </div>

          <select className="filter-select" value={filters.category} onChange={(e) => handleFilterChange('category', e.target.value)} id="filter-category">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
          </select>

          <select className="filter-select" value={filters.paymentMethod} onChange={(e) => handleFilterChange('paymentMethod', e.target.value)} id="filter-payment">
            <option value="">All Methods</option>
            <option value="cash">Cash</option>
            <option value="credit_card">Credit Card</option>
            <option value="debit_card">Debit Card</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>

          <input type="date" className="filter-input" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} style={{ minWidth: 140 }} />
          <input type="date" className="filter-input" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} style={{ minWidth: 140 }} />

          <select className="filter-select" value={`${filters.sortBy}-${filters.sortOrder}`} onChange={(e) => {
            const [sb, so] = e.target.value.split('-');
            setFilters(prev => ({ ...prev, sortBy: sb, sortOrder: so }));
          }} id="filter-sort" style={{ minWidth: 160 }}>
            <option value="date-DESC">Newest first</option>
            <option value="date-ASC">Oldest first</option>
            <option value="amount-DESC">Highest amount</option>
            <option value="amount-ASC">Lowest amount</option>
          </select>
        </div>

        {/* Table */}
        <div className="card">
          <div className="table-container">
            {loading ? (
              <div className="flex-center" style={{ padding: 60 }}>
                <div className="loading-spinner" style={{ width: 32, height: 32 }}></div>
              </div>
            ) : expenses.length > 0 ? (
              <table className="data-table" id="expenses-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Merchant</th>
                    <th>Payment</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp.id}>
                      <td>
                        {editingId === exp.id ? (
                          <input type="date" className="form-input" style={{ padding: '6px 8px', fontSize: '0.85rem' }}
                            value={editData.date} onChange={(e) => setEditData(d => ({ ...d, date: e.target.value }))} />
                        ) : exp.date}
                      </td>
                      <td>
                        {editingId === exp.id ? (
                          <input className="form-input" style={{ padding: '6px 8px', fontSize: '0.85rem' }}
                            value={editData.description || ''} onChange={(e) => setEditData(d => ({ ...d, description: e.target.value }))} />
                        ) : (exp.description || '—')}
                      </td>
                      <td>
                        {editingId === exp.id ? (
                          <select className="form-input" style={{ padding: '6px 8px', fontSize: '0.85rem' }}
                            value={editData.category} onChange={(e) => setEditData(d => ({ ...d, category: e.target.value }))}>
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </select>
                        ) : <span className="badge badge-category">{exp.category}</span>}
                      </td>
                      <td>
                        {editingId === exp.id ? (
                          <input className="form-input" style={{ padding: '6px 8px', fontSize: '0.85rem' }}
                            value={editData.merchant || ''} onChange={(e) => setEditData(d => ({ ...d, merchant: e.target.value }))} />
                        ) : (exp.merchant || '—')}
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{exp.payment_method?.replace('_', ' ') || 'Cash'}</td>
                      <td style={{ fontWeight: 700 }}>
                        {editingId === exp.id ? (
                          <input type="number" step="0.01" className="form-input" style={{ padding: '6px 8px', fontSize: '0.85rem', width: 90 }}
                            value={editData.amount} onChange={(e) => setEditData(d => ({ ...d, amount: e.target.value }))} />
                        ) : `$${Number(exp.amount).toFixed(2)}`}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {editingId === exp.id ? (
                            <>
                              <button className="btn btn-sm btn-primary" onClick={() => handleSave(exp.id)}>Save</button>
                              <button className="btn btn-sm btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button className="btn-icon" style={{ width: 32, height: 32 }} onClick={() => handleEdit(exp)}>
                                <Edit3 size={14} />
                              </button>
                              <button className="btn-icon" style={{ width: 32, height: 32, color: 'var(--accent-danger)' }} onClick={() => handleDelete(exp.id)}>
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <h3>No expenses found</h3>
                <p>Try adjusting your filters or add a new expense</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button className="pagination-btn" disabled={pagination.page <= 1} onClick={() => fetchExpenses(pagination.page - 1)}>
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 7) pageNum = i + 1;
                else if (pagination.page <= 4) pageNum = i + 1;
                else if (pagination.page >= pagination.totalPages - 3) pageNum = pagination.totalPages - 6 + i;
                else pageNum = pagination.page - 3 + i;
                return (
                  <button key={pageNum} className={`pagination-btn ${pagination.page === pageNum ? 'active' : ''}`}
                    onClick={() => fetchExpenses(pageNum)}>
                    {pageNum}
                  </button>
                );
              })}
              <button className="pagination-btn" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchExpenses(pagination.page + 1)}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </main>
      <ChatBot />
    </div>
  );
}
