'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, Edit3, ChevronLeft, ChevronRight, Download, ChevronDown, FileText, FileSpreadsheet } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import ChatBot from '@/components/ChatBot';

const CATEGORY_ICONS = {
  Food: '🍔', Groceries: '🛒', Transport: '🚌', Entertainment: '🎬', Bills: '📄',
  Shopping: '🛍️', Healthcare: '💊', Education: '📚', Travel: '✈️', Coffee: '☕',
  Restaurants: '🍽️', Utilities: '⚡', Rent: '🏠', Subscriptions: '📱', Personal: '👤', Other: '📦',
};

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
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
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
    setEditingId(exp.id || exp._id);
    setEditData({ amount: exp.amount, category: exp.category, description: exp.description, merchant: exp.merchant, date: exp.date });
  };

  const handleSave = async (id) => {
    await fetch(`/api/expenses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
    });
    setEditingId(null);
    fetchExpenses(pagination.page);
    window.dispatchEvent(new CustomEvent('expenseUpdated'));
  };

  const handleExport = async (format = 'csv') => {
    setExportLoading(true);
    setExportDropdownOpen(false);
    try {
      if (format === 'pdf') {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
        params.set('format', 'json');
        
        const res = await fetch(`/api/expenses/export?${params}`);
        if (!res.ok) throw new Error('Export JSON failed');
        const data = await res.json();
        
        // Dynamic import to prevent SSR issues
        const { default: jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        
        const doc = new jsPDF();
        doc.text('Expense Tracking Report', 14, 15);
        
        const tableData = data.expenses.map(e => [
          e.date,
          e.description || '',
          e.category,
          e.merchant || '',
          (e.paymentMethod || 'cash').replace(/_/g, ' '),
          `Rs.${Number(e.amount).toFixed(2)}`
        ]);
        
        autoTable(doc, {
          startY: 20,
          head: [['Date', 'Description', 'Category', 'Merchant', 'Payment Type', 'Amount']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [124, 111, 255] }
        });
        
        doc.save(`expenses-${new Date().toISOString().slice(0, 10)}.pdf`);
      } else {
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
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed.');
    } finally { setExportLoading(false); }
  };

  const expId = (exp) => exp.id || exp._id;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>Transactions</h1>
            <p className="text-dim">{pagination.total || expenses.length} expenses</p>
          </div>
          <div style={{ position: 'relative' }}>
            <button className="btn btn-secondary" onClick={() => setExportDropdownOpen(o => !o)} disabled={exportLoading} id="export-btn">
              <Download size={16} />
              {exportLoading ? 'Exporting...' : 'Export'}
              <ChevronDown size={14} />
            </button>
            {exportDropdownOpen && (
              <div style={{
                position: 'absolute', top: '110%', right: 0, zIndex: 100,
                background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--r-sm)', overflow: 'hidden', minWidth: 160, boxShadow: 'var(--shadow-md)',
              }}>
                <button id="export-csv-btn" onClick={() => handleExport('csv')} style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '12px 16px', background: 'none', border: 'none', borderBottom: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem',
                }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-highlight)'}
                   onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <FileSpreadsheet size={15} style={{ color: 'var(--accent-green)' }} />
                  CSV
                </button>
                <button id="export-pdf-btn" onClick={() => handleExport('pdf')} style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '12px 16px', background: 'none', border: 'none',
                  color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem',
                }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-highlight)'}
                   onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <FileText size={15} style={{ color: 'var(--accent-red)' }} />
                  PDF Document
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="filter-input" placeholder="Search..." value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              style={{ paddingLeft: 34, width: '100%' }} id="filter-search" />
          </div>
          <select className="filter-select" value={filters.category} onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))} id="filter-category">
            <option value="">All</option>
            {categories.map(c => <option key={c.id || c._id} value={c.name}>{c.icon} {c.name}</option>)}
          </select>
          <select className="filter-select" value={`${filters.sortBy}-${filters.sortOrder}`} onChange={(e) => {
            const [sb, so] = e.target.value.split('-');
            setFilters(f => ({ ...f, sortBy: sb, sortOrder: so }));
          }} id="filter-sort">
            <option value="date-DESC">Newest</option>
            <option value="date-ASC">Oldest</option>
            <option value="amount-DESC">Highest ₹</option>
            <option value="amount-ASC">Lowest ₹</option>
          </select>
        </div>

        {/* Content */}
        <div className="card">
          {loading ? (
            <div className="flex-center" style={{ padding: 48 }}>
              <div className="loading-spinner"></div>
            </div>
          ) : expenses.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="table-container mobile-hide">
                <table className="data-table" id="expenses-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(exp => (
                      <tr key={expId(exp)}>
                        <td>{editingId === expId(exp) ? (
                          <input type="date" className="form-input" style={{ padding: '6px 8px', fontSize: '0.8rem', minHeight: 36 }}
                            value={editData.date} onChange={(e) => setEditData(d => ({ ...d, date: e.target.value }))} />
                        ) : exp.date}</td>
                        <td>{editingId === expId(exp) ? (
                          <input className="form-input" style={{ padding: '6px 8px', fontSize: '0.8rem', minHeight: 36 }}
                            value={editData.description || ''} onChange={(e) => setEditData(d => ({ ...d, description: e.target.value }))} />
                        ) : (exp.description || '—')}</td>
                        <td><span className="badge badge-category">{exp.category}</span></td>
                        <td style={{ fontWeight: 700 }}>{editingId === expId(exp) ? (
                          <input type="number" step="0.01" className="form-input" style={{ padding: '6px 8px', fontSize: '0.8rem', width: 90, minHeight: 36 }}
                            value={editData.amount} onChange={(e) => setEditData(d => ({ ...d, amount: e.target.value }))} />
                        ) : `₹${Number(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {editingId === expId(exp) ? (
                              <>
                                <button className="btn btn-sm btn-primary" onClick={() => handleSave(expId(exp))}>Save</button>
                                <button className="btn btn-sm btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                              </>
                            ) : (
                              <>
                                <button className="btn-icon" style={{ width: 32, height: 32 }} onClick={() => handleEdit(exp)}><Edit3 size={14} /></button>
                                <button className="btn-icon" style={{ width: 32, height: 32, color: 'var(--accent-red)' }} onClick={() => handleDelete(expId(exp))}><Trash2 size={14} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="expense-card-list mobile-show">
                {expenses.map(exp => (
                  <div key={expId(exp)} className="expense-card-item">
                    <div className="expense-card-left">
                      <div className="expense-card-icon">
                        {CATEGORY_ICONS[exp.category] || '📦'}
                      </div>
                      <div className="expense-card-info">
                        <div className="expense-card-title">{exp.description || exp.category}</div>
                        <div className="expense-card-meta">{exp.category} • {exp.date}</div>
                      </div>
                    </div>
                    <div className="expense-card-amount">
                      -₹{Number(exp.amount).toLocaleString('en-IN')}
                    </div>
                    <div className="expense-card-actions">
                      <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => handleEdit(exp)}>
                        <Edit3 size={12} />
                      </button>
                      <button className="btn-icon" style={{ width: 28, height: 28, color: 'var(--accent-red)' }} onClick={() => handleDelete(expId(exp))}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>No expenses found</h3>
              <p>Try adjusting your filters or add a new expense</p>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button className="pagination-btn" disabled={pagination.page <= 1} onClick={() => fetchExpenses(pagination.page - 1)}>
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                let pageNum = i + 1;
                if (pagination.totalPages > 5) {
                  if (pagination.page <= 3) pageNum = i + 1;
                  else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                  else pageNum = pagination.page - 2 + i;
                }
                return (
                  <button key={pageNum} className={`pagination-btn ${pagination.page === pageNum ? 'active' : ''}`}
                    onClick={() => fetchExpenses(pageNum)}>{pageNum}</button>
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
