'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, ChevronDown } from 'lucide-react';

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: "Hi! I'm FinBot 🤖, your AI financial assistant. I can help you:\n\n• **Add expenses**: \"I spent ₹450 on groceries yesterday\"\n• **View spending**: \"How much did I spend this month?\"\n• **Update expenses**: \"Change my last expense to ₹500\"\n• **Delete expenses**: \"Delete my last expense\"\n• **Get insights**: \"Give me spending insights\"\n\nHow can I help you?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastExpenseIds, setLastExpenseIds] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Prevent body scroll when chat is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role === 'ai' ? 'model' : 'user', content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversationHistory,
          lastExpenseIds,
        }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);

      if (data.newExpenseIds && data.newExpenseIds.length > 0) {
        setLastExpenseIds(data.newExpenseIds);
      }
      
      window.dispatchEvent(new CustomEvent('expenseUpdated'));
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'ai', content: 'Sorry, I encountered a network error. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>')
      .replace(/• /g, '&bull; ');
  };

  return (
    <>
      {/* ========== FAB BUTTON (mobile + desktop) ========== */}
      {!isOpen && (
        <button
          className="chat-fab"
          onClick={() => setIsOpen(true)}
          id="chat-fab"
          aria-label="Open AI Chat"
        >
          <MessageCircle size={24} />
          <div className="chat-fab-pulse" />
        </button>
      )}

      {/* ========== CHAT OVERLAY ========== */}
      {isOpen && (
        <div className="chat-overlay" id="chat-overlay">
          <div className="chat-panel">
            {/* Header */}
            <div className="chat-header">
              <div className="chat-header-info">
                <div className="chat-header-avatar">
                  <Bot size={20} color="var(--accent-primary)" />
                  <div className="online-indicator" />
                </div>
                <div>
                  <h3>FinBot AI</h3>
                  <p className="chat-status">Online • Ready to help</p>
                </div>
              </div>
              <button className="chat-close-btn" onClick={() => setIsOpen(false)} aria-label="Close chat">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="chat-messages" id="chat-messages">
              {messages.map((msg, i) => (
                <div key={i} className={`chat-message ${msg.role === 'user' ? 'user' : 'ai'}`}>
                  <div className="chat-message-content">
                    <div
                      dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                    />
                  </div>
                </div>
              ))}
              {loading && (
                <div className="chat-message ai">
                  <div className="chat-message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-container">
              <div className="chat-input-wrapper">
                <textarea
                  ref={inputRef}
                  className="chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder='Ask about your spending...'
                  rows={1}
                  disabled={loading}
                  id="chat-input"
                />
                <button
                  className="chat-send-btn"
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  id="chat-send-btn"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
