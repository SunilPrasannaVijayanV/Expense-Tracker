'use client';

import { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import Sidebar from '@/components/Sidebar';
import ChatBot from '@/components/ChatBot';

const COLORS = ['#6C63FF', '#00D4AA', '#FF6B6B', '#FFB347', '#45B7D1', '#DDA0DD', '#96CEB4', '#F7DC6F', '#BB8FCE', '#D4A574'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(18,18,30,0.95)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem',
      }}>
        <p style={{ color: '#9595A8', marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: ${Number(p.value).toFixed(2)}</p>
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
      const d = await res.json();
      setData(d);
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
            <div className="loading-spinner" style={{ width: 40, height: 40 }}></div>
          </div>
        </main>
      </div>
    );
  }

  const pieData = (data?.categoryBreakdown || []).map(c => ({ name: c.category, value: c.total, count: c.count }));
  const totalSpend = pieData.reduce((s, d) => s + d.value, 0);

  const trendData = (data?.monthlyTrending || []).map(m => ({ name: m.month, total: m.total, count: m.count }));
  const dailyData = (data?.dailySpending || []).map(d => ({ name: d.date.slice(5), amount: d.total }));

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>Analytics</h1>
            <p>Deep dive into your spending patterns</p>
          </div>
        </div>

        {/* Top Summary */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">This Month Total</span>
            </div>
            <div className="stat-card-value">${Number(data?.totalMonth || 0).toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Last Month Total</span>
            </div>
            <div className="stat-card-value">${Number(data?.totalLastMonth || 0).toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Month Change</span>
            </div>
            <div className="stat-card-value" style={{
              color: Number(data?.monthlyChange) > 0 ? 'var(--accent-danger)' : 'var(--accent-secondary)',
            }}>
              {Number(data?.monthlyChange) > 0 ? '+' : ''}{data?.monthlyChange || 0}%
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Top Category</span>
            </div>
            <div className="stat-card-value" style={{ fontSize: '1.25rem' }}>
              {pieData[0]?.name || 'N/A'}
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          {/* Category Pie */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Category Breakdown</span>
              <span className="card-subtitle">This month</span>
            </div>
            <div className="chart-container" style={{ height: 320 }}>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
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

          {/* Category Bar */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Category Comparison</span>
              <span className="card-subtitle">Amount by category</span>
            </div>
            <div className="chart-container" style={{ height: 320 }}>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pieData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" stroke="#5C5C72" fontSize={11} />
                    <YAxis type="category" dataKey="name" stroke="#5C5C72" fontSize={11} width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Amount" radius={[0, 6, 6, 0]}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state"><div className="empty-state-icon">📊</div><p>No data yet</p></div>
              )}
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          {/* Daily Trend */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Daily Spending Trend</span>
              <span className="card-subtitle">This month</span>
            </div>
            <div className="chart-container">
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#5C5C72" fontSize={11} />
                    <YAxis stroke="#5C5C72" fontSize={11} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="amount" name="Spent" stroke="#00D4AA" strokeWidth={2} dot={{ fill: '#00D4AA', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state"><div className="empty-state-icon">📈</div><p>No data yet</p></div>
              )}
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Monthly Spending Trend</span>
              <span className="card-subtitle">Last 6 months</span>
            </div>
            <div className="chart-container">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#5C5C72" fontSize={11} />
                    <YAxis stroke="#5C5C72" fontSize={11} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" name="Total" fill="#6C63FF" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state"><div className="empty-state-icon">📊</div><p>No trend data yet</p></div>
              )}
            </div>
          </div>
        </div>

        {/* Category Details Table + Top Merchants */}
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Category Details</span>
              <span className="card-subtitle">This month breakdown</span>
            </div>
            {pieData.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Transactions</th>
                      <th>Amount</th>
                      <th>% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pieData.map((c, i) => (
                      <tr key={c.name}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length] }}></div>
                            {c.name}
                          </div>
                        </td>
                        <td>{c.count}</td>
                        <td style={{ fontWeight: 600 }}>${c.value.toFixed(2)}</td>
                        <td>{totalSpend > 0 ? ((c.value / totalSpend) * 100).toFixed(1) : 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 30 }}>
                <p>No category data yet</p>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Top Merchants</span>
              <span className="card-subtitle">This month</span>
            </div>
            {(data?.topMerchants || []).length > 0 ? (
              <div>
                {data.topMerchants.map((m, i) => (
                  <div key={m.merchant} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 0', borderBottom: '1px solid var(--border-color)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 'var(--radius-md)',
                        background: `${COLORS[i]}20`, color: COLORS[i],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.85rem', fontWeight: 700,
                      }}>
                        #{i + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.merchant}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.count} transactions</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700 }}>${Number(m.total).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 30 }}>
                <p>No merchant data yet</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <ChatBot />
    </div>
  );
}
