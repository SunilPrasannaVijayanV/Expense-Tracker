'use client';

import { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import Sidebar from '@/components/Sidebar';
import ChatBot from '@/components/ChatBot';

const COLORS = ['#7C6FFF', '#1DB954', '#a78bfa', '#FFB347', '#FF6B6B', '#45B7D1', '#DDA0DD', '#96CEB4', '#F7DC6F', '#BB8FCE'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--r-sm)', padding: '8px 12px', fontSize: '0.8rem',
      }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 3 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: ₹{Number(p.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.status === 401) { window.location.href = '/login'; return; }
      setData(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const handler = () => fetchAnalytics();
    window.addEventListener('expenseUpdated', handler);
    return () => window.removeEventListener('expenseUpdated', handler);
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <div className="flex-center" style={{ height: '60vh' }}>
            <div className="loading-spinner"></div>
          </div>
        </main>
      </div>
    );
  }

  const pieData = (data?.categoryBreakdown || []).map(c => ({ name: c.category, value: c.total }));
  const totalSpend = pieData.reduce((s, d) => s + d.value, 0);
  const trendData = (data?.monthlyTrending || []).map(m => ({ name: m.month, total: m.total }));

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>Analytics</h1>
            <p className="text-dim">Spending patterns & insights</p>
          </div>
        </div>

        {/* Summary */}
        <div className="stats-grid" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-card-header"><span className="stat-card-label">This Month</span></div>
            <div className="stat-card-value">₹{Number(data?.totalMonth || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><span className="stat-card-label">Change</span></div>
            <div className="stat-card-value" style={{
              color: Number(data?.monthlyChange) > 0 ? 'var(--accent-red)' : 'var(--accent-green)',
            }}>
              {Number(data?.monthlyChange) > 0 ? '+' : ''}{data?.monthlyChange || 0}%
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><span className="stat-card-label">Top Category</span></div>
            <div className="stat-card-value" style={{ fontSize: '1.1rem' }}>{pieData[0]?.name || 'N/A'}</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid-2" style={{ marginBottom: 16 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Category Breakdown</span>
            </div>
            <div className="chart-container">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state"><div className="empty-state-icon">📊</div><p>No data yet</p></div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Monthly Trend</span>
            </div>
            <div className="chart-container">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="name" stroke="#6A6A80" fontSize={10} />
                    <YAxis stroke="#6A6A80" fontSize={10} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" name="Total" fill="#7C6FFF" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state"><div className="empty-state-icon">📊</div><p>No trend data</p></div>
              )}
            </div>
          </div>
        </div>

        {/* Category Details */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Category Details</span>
            <span className="card-subtitle">This month</span>
          </div>
          {pieData.length > 0 ? (
            <div className="expense-card-list">
              {pieData.map((c, i) => (
                <div key={c.name} className="expense-card-item">
                  <div className="expense-card-left">
                    <div className="expense-card-icon" style={{ background: `${COLORS[i % COLORS.length]}20`, fontSize: '0.8rem', fontWeight: 700, color: COLORS[i % COLORS.length] }}>
                      {((c.value / totalSpend) * 100).toFixed(0)}%
                    </div>
                    <div className="expense-card-info">
                      <div className="expense-card-title">{c.name}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    ₹{c.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 24 }}><p>No category data yet</p></div>
          )}
        </div>
      </main>
      <ChatBot />
    </div>
  );
}
