// AI Client — calls Claude API via Supabase Edge Function or direct API
// Configure VITE_AI_ENDPOINT in .env to point to your edge function or proxy

const AI_ENDPOINT = import.meta.env.VITE_AI_ENDPOINT || '/api/ai-generate';
const AI_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';

// Build context string from business data
export function buildContext(data = {}) {
  const parts = [];

  if (data.settings) {
    parts.push(`Company: ${data.settings.companyName || 'Clad Forge'}, owned by ${data.settings.ownerName || 'Courtland Adaire'}.`);
    parts.push(`Location: ${data.settings.companyAddress || 'Tyler, Texas'}. Website: ${data.settings.companyWebsite || 'cladforge.com'}.`);
  }

  if (data.clients?.length) {
    const active = data.clients.filter(c => c.status === 'active');
    const prospects = data.clients.filter(c => c.status === 'prospect');
    parts.push(`\nClients: ${data.clients.length} total (${active.length} active, ${prospects.length} prospects).`);
    parts.push('Active clients: ' + active.map(c => `${c.company} (${c.industry}, contact: ${c.name})`).join('; ') + '.');
  }

  if (data.projects?.length) {
    const byStage = {};
    data.projects.forEach(p => { byStage[p.stage] = (byStage[p.stage] || 0) + 1; });
    parts.push(`\nProjects: ${data.projects.length} total. By stage: ${Object.entries(byStage).map(([k, v]) => `${k}: ${v}`).join(', ')}.`);
    const active = data.projects.filter(p => p.stage === 'active');
    if (active.length) {
      parts.push('Active projects: ' + active.map(p => `"${p.title}" ($${p.budget}, deadline: ${p.deadline})`).join('; ') + '.');
    }
  }

  if (data.invoices?.length) {
    const paid = data.invoices.filter(i => i.status === 'paid');
    const overdue = data.invoices.filter(i => i.status === 'overdue');
    const outstanding = data.invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
    parts.push(`\nInvoices: ${data.invoices.length} total. ${paid.length} paid, ${outstanding.length} outstanding, ${overdue.length} overdue.`);
  }

  if (data.sows?.length) {
    parts.push(`\nProposals/SOWs: ${data.sows.length} total. Statuses: ${data.sows.map(s => `"${s.projectTitle}" (${s.status})`).join(', ')}.`);
  }

  // If a specific client is selected, include detailed info
  if (data.selectedClient) {
    const c = data.selectedClient;
    parts.push(`\n\nFocused client: ${c.company} (${c.name}, ${c.email}).`);
    parts.push(`Industry: ${c.industry}. Status: ${c.status}. Value: $${c.value}.`);
    if (c.notes) parts.push(`Notes: ${c.notes}`);
    if (c.brandTone) parts.push(`Brand tone: ${c.brandTone}`);
    if (c.brandColors?.length) parts.push(`Brand colors: ${c.brandColors.join(', ')}`);
  }

  // If a specific project is selected
  if (data.selectedProject) {
    const p = data.selectedProject;
    parts.push(`\n\nFocused project: "${p.title}". Budget: $${p.budget}. Stage: ${p.stage}. Deadline: ${p.deadline}.`);
    if (p.description) parts.push(`Description: ${p.description}`);
  }

  return parts.join('\n');
}

// Send a message to the AI
export async function sendMessage(messages, context = '', options = {}) {
  const systemPrompt = `You are a business assistant for Clad Forge, an engineering and design services firm. You help with drafting proposals, emails, project plans, and business strategy. Be concise, professional, and actionable. Use markdown formatting.

${context ? `\n--- BUSINESS CONTEXT ---\n${context}\n--- END CONTEXT ---` : ''}`;

  // If we have a direct API key, call Claude API directly (for development)
  if (AI_API_KEY) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AI_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: options.model || 'claude-sonnet-4-20250514',
        max_tokens: options.maxTokens || 2048,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role === 'ai' ? 'assistant' : m.role,
          content: m.text || m.content,
        })),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0]?.text || '';
  }

  // Otherwise call the edge function / proxy endpoint
  const response = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages.map(m => ({
        role: m.role === 'ai' ? 'assistant' : m.role,
        content: m.text || m.content,
      })),
      system: systemPrompt,
      model: options.model || 'claude-sonnet-4-20250514',
      maxTokens: options.maxTokens || 2048,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `AI endpoint error: ${response.status}`);
  }

  const data = await response.json();
  return data.text || data.content || '';
}
