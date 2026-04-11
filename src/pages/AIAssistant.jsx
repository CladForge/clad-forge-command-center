import { useState, useRef, useEffect, useMemo } from 'react';
import { sendMessage, buildContext } from '../lib/aiClient';
import { aiTemplates } from '../data/aiTemplates';

function renderMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:var(--surface);padding:1px 4px;border-radius:3px;font-size:0.85em">$1</code>')
    .replace(/^### (.*$)/gm, '<h4 style="margin:8px 0 4px;color:var(--ink)">$1</h4>')
    .replace(/^## (.*$)/gm, '<h3 style="margin:10px 0 6px;color:var(--ink)">$1</h3>')
    .replace(/^# (.*$)/gm, '<h2 style="margin:12px 0 8px;color:var(--ink)">$1</h2>')
    .replace(/^- (.*$)/gm, '<div style="padding-left:12px">• $1</div>')
    .replace(/^\d+\. (.*$)/gm, (match, p1, offset, str) => {
      const num = match.match(/^(\d+)/)[1];
      return `<div style="padding-left:12px">${num}. ${p1}</div>`;
    });
}

export default function AIAssistant({ clients = [], projects = [], sows = [], invoices = [], settings = {} }) {
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hi! I'm your AI business assistant powered by Claude. I can help draft proposals, emails, project plans, and provide business insights — all with context from your Clad Forge data.\n\nTry a template below or ask me anything." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [showTemplates, setShowTemplates] = useState(true);
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  const contextData = useMemo(() => ({
    clients,
    projects,
    sows,
    invoices,
    settings,
    selectedClient: selectedClient ? clients.find(c => c.id === selectedClient) : null,
    selectedProject: selectedProject ? projects.find(p => p.id === selectedProject) : null,
  }), [clients, projects, sows, invoices, settings, selectedClient, selectedProject]);

  async function send(text) {
    if (!text?.trim() || loading) return;
    const userMsg = text.trim();
    setInput('');
    setError(null);
    setShowTemplates(false);

    const newMessages = [...messages, { role: 'user', text: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const context = buildContext(contextData);
      const aiText = await sendMessage(
        newMessages.filter(m => m.role !== 'system'),
        context,
      );
      setMessages(prev => [...prev, { role: 'ai', text: aiText }]);
    } catch (err) {
      setError(err.message);
      setMessages(prev => [...prev, { role: 'ai', text: `I encountered an error: ${err.message}\n\nTo use AI features, configure your API key:\n- Set \`VITE_ANTHROPIC_API_KEY\` in your \`.env\` file for direct API access\n- Or set \`VITE_AI_ENDPOINT\` to point to a Supabase Edge Function proxy` }]);
    } finally {
      setLoading(false);
    }
  }

  function useTemplate(template) {
    const parts = [];
    if (selectedClient) {
      const c = clients.find(c => c.id === selectedClient);
      if (c) parts.push(`Client: ${c.company}`);
    }
    if (selectedProject) {
      const p = projects.find(p => p.id === selectedProject);
      if (p) parts.push(`Project: ${p.title}`);
    }
    const msg = parts.length > 0
      ? `${template.prompt}\n\nContext: ${parts.join(', ')}`
      : template.prompt;
    send(msg);
  }

  function clearChat() {
    setMessages([
      { role: 'ai', text: "Chat cleared. How can I help you?" }
    ]);
    setShowTemplates(true);
    setError(null);
  }

  return (
    <div className="ai-assistant page--fill">
      {/* Context selectors */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        flexWrap: 'wrap',
        fontSize: '0.82rem',
      }}>
        <span style={{ color: 'var(--slate)', fontWeight: 500 }}>Context:</span>
        <select
          value={selectedClient}
          onChange={e => setSelectedClient(e.target.value)}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--ink)',
            fontSize: '0.8rem',
          }}
        >
          <option value="">All clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
        </select>
        <select
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--ink)',
            fontSize: '0.8rem',
          }}
        >
          <option value="">All projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn btn--ghost btn--sm" onClick={clearChat}>Clear Chat</button>
      </div>

      {/* Chat area */}
      <div className="ai-chat" ref={chatRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`ai-msg ai-msg--${msg.role}`}>
            <div className="ai-msg-avatar">{msg.role === 'ai' ? 'AI' : 'You'}</div>
            <div className="ai-msg-bubble">
              {msg.text.split('\n').map((line, j) => (
                line.trim() === '' ? <br key={j} /> :
                <p key={j} dangerouslySetInnerHTML={{ __html: renderMarkdown(line) }} />
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="ai-msg ai-msg--ai">
            <div className="ai-msg-avatar">AI</div>
            <div className="ai-msg-bubble"><div className="ai-typing"><span /><span /><span /></div></div>
          </div>
        )}
        {error && !loading && (
          <div style={{ padding: '8px 16px', fontSize: '0.78rem', color: 'var(--danger)' }}>
            {error}
          </div>
        )}
      </div>

      {/* Templates & input */}
      <div className="ai-input-area">
        {showTemplates && (
          <div style={{
            padding: '12px 16px 8px',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--slate)', marginBottom: 8, fontWeight: 500 }}>
              TEMPLATES
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 6,
            }}>
              {aiTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={() => useTemplate(t)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.target.style.borderColor = 'var(--brand)'; e.target.style.background = 'var(--brand-wash)'; }}
                  onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--surface)'; }}
                >
                  <span style={{ marginRight: 6 }}>{t.icon}</span>
                  {t.name}
                  <div style={{ fontSize: '0.7rem', color: 'var(--slate)', marginTop: 2 }}>{t.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="ai-suggestions">
          {!showTemplates && (
            <button className="ai-suggestion" onClick={() => setShowTemplates(true)}>Show templates</button>
          )}
          <button className="ai-suggestion" onClick={() => send('Summarize my active projects and their status')}>Active projects</button>
          <button className="ai-suggestion" onClick={() => send('What are my most important tasks this week?')}>Weekly priorities</button>
          <button className="ai-suggestion" onClick={() => send('Analyze my revenue and suggest growth strategies')}>Revenue analysis</button>
        </div>

        <div className="ai-input-row">
          <input
            className="ai-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
            placeholder={loading ? 'Thinking...' : 'Ask me anything about your business...'}
            disabled={loading}
          />
          <button className="ai-send" onClick={() => send(input)} disabled={loading || !input.trim()}>
            {loading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
