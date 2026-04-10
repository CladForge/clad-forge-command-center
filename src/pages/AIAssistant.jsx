import { useState, useRef, useEffect } from 'react';

const suggestions = [
  'Draft a follow-up email for an overdue invoice',
  'Summarize my active projects',
  'Write a project proposal outline',
  'What metrics should I track for client retention?',
  'Help me plan a sprint for next week',
];

const responses = {
  'draft a follow-up email for an overdue invoice': `Here's a professional follow-up email:\n\n**Subject:** Friendly Reminder — Invoice #[NUMBER] Past Due\n\nHi [Client Name],\n\nI hope this message finds you well. I wanted to follow up regarding Invoice #[NUMBER] for $[AMOUNT], which was due on [DATE].\n\nI understand things can get busy, so I wanted to send a gentle reminder. You can find the invoice attached or view it in your client portal.\n\nPlease let me know if you have any questions or if there's anything I can help with.\n\nBest regards,\nCourtland Adaire\nClad Forge`,
  'summarize my active projects': `Here's a summary of your active projects:\n\n1. **Fleet Dashboard** — Meridian Co. ($45,000)\n   Status: In development, 65% complete\n\n2. **Client Portal v2** — Vanguard Digital ($28,000)\n   Status: Design phase, 30% complete\n\n3. **AI Chatbot Integration** — Horizon Inc. ($15,000)\n   Status: Testing phase, 85% complete\n\nTotal active value: **$88,000**\nEstimated completion: 3-6 weeks`,
  'write a project proposal outline': `**Project Proposal Outline:**\n\n1. **Executive Summary** — Brief overview of the project and its goals\n2. **Problem Statement** — What challenge the client faces\n3. **Proposed Solution** — Your approach and methodology\n4. **Scope of Work** — Detailed deliverables and milestones\n5. **Timeline** — Phase-by-phase schedule\n6. **Investment** — Pricing breakdown with payment terms\n7. **Team** — Who will work on the project\n8. **Terms & Conditions** — Legal and contractual terms\n9. **Next Steps** — How to proceed\n\nWant me to flesh out any of these sections?`,
  'default': `That's a great question. Let me help you with that.\n\nBased on my understanding of your business at Clad Forge, I can assist with:\n\n- **Client communications** — emails, proposals, follow-ups\n- **Project planning** — timelines, sprints, resource allocation\n- **Business strategy** — pricing, growth, client retention\n- **Content creation** — case studies, documentation, reports\n- **Data analysis** — revenue trends, project metrics\n\nCould you give me a bit more detail so I can provide a more specific response?`,
};

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hi! I'm your AI business assistant. I can help draft emails, plan projects, analyze data, and brainstorm strategy. What would you like to work on?" }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, typing]);

  function send(text) {
    if (!text?.trim()) return;
    const userMsg = text.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setTyping(true);
    setTimeout(() => {
      const key = userMsg.toLowerCase();
      const resp = responses[key] || responses['default'];
      setMessages(prev => [...prev, { role: 'ai', text: resp }]);
      setTyping(false);
    }, 1200 + Math.random() * 800);
  }

  return (
    <div className="ai-assistant">
      <div className="ai-chat" ref={chatRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`ai-msg ai-msg--${msg.role}`}>
            <div className="ai-msg-avatar">{msg.role === 'ai' ? 'AI' : 'You'}</div>
            <div className="ai-msg-bubble">
              {msg.text.split('\n').map((line, j) => (
                <p key={j} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              ))}
            </div>
          </div>
        ))}
        {typing && (
          <div className="ai-msg ai-msg--ai">
            <div className="ai-msg-avatar">AI</div>
            <div className="ai-msg-bubble"><div className="ai-typing"><span /><span /><span /></div></div>
          </div>
        )}
      </div>
      <div className="ai-input-area">
        <div className="ai-suggestions">
          {suggestions.map((s, i) => (
            <button key={i} className="ai-suggestion" onClick={() => send(s)}>{s}</button>
          ))}
        </div>
        <div className="ai-input-row">
          <input
            className="ai-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send(input)}
            placeholder="Ask me anything about your business..."
          />
          <button className="ai-send" onClick={() => send(input)}>Send</button>
        </div>
      </div>
    </div>
  );
}
