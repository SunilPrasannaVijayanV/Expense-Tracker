'use client';

import { useState, useEffect, useCallback } from 'react';
import { DollarSign, TrendingUp, TrendingDown, ShoppingBag, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import Sidebar from '@/components/Sidebar';
import ChatBot from '@/components/ChatBot';

const CHART_COLORS = [
  'hsl(245, 100%, 70%)', // Primary
  'hsl(170, 100%, 45%)', // Secondary
  'hsl(280, 100%, 70%)', // Violet
  'hsl(35, 100%, 65%)',  // Warning
  'hsl(0, 100%, 65%)',   // Danger
  'hsl(190, 100%, 50%)', // Info
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-deep)', 
        border: '1px solid var(--border-light)',
        borderRadius: '12px', 
        padding: '12px 16px', 
        fontSize: '0.85rem',
        boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(10px)'
      }}>
        <p style={{ color: 'var(--text-dim)', marginBottom: '6px', fontWeight: 600 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: ${Number(p.value).toFixed(2)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async (retryOnce = true) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch('/api/dashboard', { signal: controller.signal });
      clearTimeout(timeout);
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const d = await res.json();
      setData(d);
    } catch (err) {
      clearTimeout(timeout);
      if (retryOnce) {
        // Wait 1s then retry once — handles transient failures after long AI calls
        setTimeout(() => fetchDashboard(false), 1000);
      } else {
        console.error('Dashboard fetch error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    fetchDashboard();
    const handler = () => fetchDashboard();
    window.addEventListener('expenseUpdated', handler);
    return () => window.removeEventListener('expenseUpdated', handler);
  }, [fetchDashboard]);

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

  const pieData = (data?.categoryBreakdown || []).map(c => ({
    name: c.category,
    value: c.total,
  }));

  const trendData = (data?.monthlyTrending || []).map(m => ({
    name: m.month,
    total: m.total,
  }));

  const dailyData = (data?.dailySpending || []).map(d => ({
    name: d.date.slice(5),
    amount: d.total,
  }));

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header animate-in">
          <div>
            <h1 className="text-gradient">Financial Hub</h1>
            <p className="text-dim">Your cosmic overview of spending and wealth</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary glass">
              <TrendingUp size={16} />
              <span>Insights</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card glass animate-in" style={{ animationDelay: '0.1s' }}>
            <div className="stat-card-header">
              <span className="stat-card-label">Monthly Spending</span>
              <div className="stat-card-icon"><DollarSign size={20} /></div>
            </div>
            <div className="stat-card-value">${Number(data?.totalMonth || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className={`stat-card-change ${Number(data?.monthlyChange) >= 0 ? 'negative' : 'positive'}`}>
              {Number(data?.monthlyChange) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(data?.monthlyChange || 0)}% <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>vs last month</span>
            </div>
          </div>

          <div className="stat-card glass animate-in" style={{ animationDelay: '0.2s' }}>
            <div className="stat-card-header">
              <span className="stat-card-label">Daily Burn Rate</span>
              <div className="stat-card-icon"><TrendingUp size={20} /></div>
            </div>
            <div className="stat-card-value">${Number(data?.dailyAverage || 0).toFixed(2)}</div>
            <div className="stat-card-change" style={{ color: 'var(--text-muted)' }}>
              Average daily spend
            </div>
          </div>

          <div className="stat-card glass animate-in" style={{ animationDelay: '0.3s' }}>
            <div className="stat-card-header">
              <span className="stat-card-label">Transactions</span>
              <div className="stat-card-icon"><ShoppingBag size={20} /></div>
            </div>
            <div className="stat-card-value">{data?.expenseCount || 0}</div>
            <div className="stat-card-change" style={{ color: 'var(--text-muted)' }}>
              Active logs this month
            </div>
          </div>

          <div className="stat-card glass animate-in" style={{ animationDelay: '0.4s' }}>
            <div className="stat-card-header">
              <span className="stat-card-label">Active Budgets</span>
              <div className="stat-card-icon"><Target size={20} /></div>
            </div>
            <div className="stat-card-value">
              {data?.budgetStatus?.filter(b => b.percentage < 100).length || 0}
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}> / {data?.budgetStatus?.length || 0}</span>
            </div>
            <div className="stat-card-change positive">
              Healthy & On track
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          {/* Category Pie Chart */}
          <div className="card glass animate-in" style={{ animationDelay: '0.5s' }}>
            <div className="card-header">
              <div>
                <h3 className="card-title">Allocation</h3>
                <p className="card-subtitle">Spending by category</p>
              </div>
            </div>
            <div className="chart-container" style={{ minHeight: '280px' }}>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((d, i) => (
                        <Cell key={`cell-${d.name}-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📊</div>
                  <p>No expenses yet this month</p>
                </div>
              )}
            </div>
            {/* Legend */}
            {pieData.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                {pieData.slice(0, 6).map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length] }}></div>
                    {d.name}: ${d.value.toFixed(0)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Daily Spending Area Chart */}
          <div className="card glass animate-in" style={{ animationDelay: '0.6s' }}>
            <div className="card-header">
              <div>
                <h3 className="card-title">Spending Velocity</h3>
                <p className="card-subtitle">Daily breakdown this month</p>
              </div>
            </div>
            <div className="chart-container" style={{ minHeight: '280px' }}>
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6C63FF" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#6C63FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#5C5C72" fontSize={11} />
                    <YAxis stroke="#5C5C72" fontSize={11} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="amount" stroke="#6C63FF" fill="url(#colorAmount)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📈</div>
                  <p>No data to show yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Trend + Recent Transactions */}
        <div className="grid-2">
          {/* Monthly Trend */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Monthly Trend</span>
              <span className="card-subtitle">Last 6 months</span>
            </div>
            <div className="chart-container" style={{ minHeight: '200px' }}>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#5C5C72" fontSize={11} />
                    <YAxis stroke="#5C5C72" fontSize={11} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" fill="#6C63FF" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📊</div>
                  <p>Start tracking expenses to see trends</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Transactions</span>
              <span className="card-subtitle">Latest 5</span>
            </div>
            {(data?.recentExpenses || []).length > 0 ? (
              <div>
                {data.recentExpenses.map(exp => (
                  <div key={exp._id || exp.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 0', borderBottom: '1px solid var(--border-color)',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {exp.description || exp.category}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {exp.category} • {exp.date}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--accent-danger)' }}>
                      -${Number(exp.amount).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 30 }}>
                <div className="empty-state-icon">💸</div>
                <p>No transactions yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Budget Status */}
        {data?.budgetStatus && data.budgetStatus.length > 0 && (
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-header">
              <span className="card-title">Budget Status</span>
              <span className="card-subtitle">Current month</span>
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              {data.budgetStatus.map(b => (
                <div key={b.id} className="budget-card" style={{ padding: 16 }}>
                  <div className="budget-header">
                    <span className="budget-category">{b.category}</span>
                    <div className="budget-amounts">
                      <span className="spent">${Number(b.spent).toFixed(0)}</span> / ${Number(b.amount).toFixed(0)}
                    </div>
                  </div>
                  <div className="budget-progress">
                    <div
                      className={`budget-progress-bar ${b.percentage >= 100 ? 'danger' : b.percentage >= 75 ? 'warning' : 'safe'}`}
                      style={{ width: `${Math.min(b.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <ChatBot />
    </div>
  );
}
