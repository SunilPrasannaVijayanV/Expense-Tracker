'use client';

import { useState, useEffect, useCallback } from 'react';
import { DollarSign, TrendingUp, ShoppingBag, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import Sidebar from '@/components/Sidebar';
import ChatBot from '@/components/ChatBot';

const CHART_COLORS = ['#7C6FFF', '#1DB954', '#a78bfa', '#FFB347', '#FF6B6B', '#45B7D1'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '10px',
        padding: '10px 14px',
        fontSize: '0.8rem',
        boxShadow: 'var(--shadow-md)',
      }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: ₹{Number(p.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const formatINR = (amount) => {
  return Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
      if (res.status === 401) { window.location.href = '/login'; return; }
      const d = await res.json();
      setData(d);
    } catch (err) {
      clearTimeout(timeout);
      if (retryOnce) {
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
            <div className="loading-spinner" style={{ width: 36, height: 36 }}></div>
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

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header animate-in">
          <div>
            <h1>Financial Hub</h1>
            <p className="text-dim">Your overview of spending and wealth</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card animate-in" style={{ animationDelay: '0.1s' }}>
            <div className="stat-card-header">
              <span className="stat-card-label">Monthly Spend</span>
              <div className="stat-card-icon"><DollarSign size={18} /></div>
            </div>
            <div className="stat-card-value">₹{formatINR(data?.totalMonth)}</div>
            <div className={`stat-card-change ${Number(data?.monthlyChange) >= 0 ? 'negative' : 'positive'}`}>
              {Number(data?.monthlyChange) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(data?.monthlyChange || 0)}%
              <span style={{ opacity: 0.6, fontSize: '0.65rem', marginLeft: 2 }}>vs last month</span>
            </div>
          </div>

          <div className="stat-card animate-in" style={{ animationDelay: '0.15s' }}>
            <div className="stat-card-header">
              <span className="stat-card-label">Daily Average</span>
              <div className="stat-card-icon"><TrendingUp size={18} /></div>
            </div>
            <div className="stat-card-value">₹{formatINR(data?.dailyAverage)}</div>
            <div className="stat-card-change">Per day this month</div>
          </div>

          <div className="stat-card animate-in" style={{ animationDelay: '0.2s' }}>
            <div className="stat-card-header">
              <span className="stat-card-label">Transactions</span>
              <div className="stat-card-icon"><ShoppingBag size={18} /></div>
            </div>
            <div className="stat-card-value">{data?.expenseCount || 0}</div>
            <div className="stat-card-change">This month</div>
          </div>

          <div className="stat-card animate-in" style={{ animationDelay: '0.25s' }}>
            <div className="stat-card-header">
              <span className="stat-card-label">Budgets</span>
              <div className="stat-card-icon"><Target size={18} /></div>
            </div>
            <div className="stat-card-value">
              {data?.budgetStatus?.filter(b => b.percentage < 100).length || 0}
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}> / {data?.budgetStatus?.length || 0}</span>
            </div>
            <div className="stat-card-change positive">On track</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid-2" style={{ marginBottom: 16 }}>
          {/* Category Pie */}
          <div className="card animate-in" style={{ animationDelay: '0.3s' }}>
            <div className="card-header">
              <div>
                <h3 className="card-title">Allocation</h3>
                <p className="card-subtitle">By category</p>
              </div>
            </div>
            <div className="chart-container">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
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
            {pieData.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                {pieData.slice(0, 6).map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length] }}></div>
                    {d.name}: ₹{d.value.toFixed(0)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monthly Trend */}
          <div className="card animate-in" style={{ animationDelay: '0.35s' }}>
            <div className="card-header">
              <div>
                <h3 className="card-title">Monthly Trend</h3>
                <p className="card-subtitle">Last 6 months</p>
              </div>
            </div>
            <div className="chart-container">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="name" stroke="#6A6A80" fontSize={10} />
                    <YAxis stroke="#6A6A80" fontSize={10} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" fill="#7C6FFF" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📊</div>
                  <p>Start tracking to see trends</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card animate-in" style={{ animationDelay: '0.4s' }}>
          <div className="card-header">
            <span className="card-title">Recent Transactions</span>
            <span className="card-subtitle">Latest 5</span>
          </div>
          {(data?.recentExpenses || []).length > 0 ? (
            <div className="expense-card-list">
              {data.recentExpenses.map(exp => (
                <div key={exp._id || exp.id} className="expense-card-item">
                  <div className="expense-card-left">
                    <div className="expense-card-info">
                      <div className="expense-card-title">{exp.description || exp.category}</div>
                      <div className="expense-card-meta">{exp.category} • {exp.date}</div>
                    </div>
                  </div>
                  <div className="expense-card-amount">-₹{Number(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 24 }}>
              <div className="empty-state-icon">💸</div>
              <p>No transactions yet</p>
            </div>
          )}
        </div>

        {/* Budget Status */}
        {data?.budgetStatus && data.budgetStatus.length > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <span className="card-title">Budget Status</span>
              <span className="card-subtitle">Current month</span>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {data.budgetStatus.map(b => (
                <div key={b.id} className="budget-card" style={{ padding: 14 }}>
                  <div className="budget-header">
                    <span className="budget-category">{b.category}</span>
                    <div className="budget-amounts">
                      <span className="spent">₹{Number(b.spent).toFixed(0)}</span> / ₹{Number(b.amount).toFixed(0)}
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
