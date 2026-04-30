// Invites a user to the Clad Forge client portal.
//
// Flow:
//   1. Verify the caller is an authenticated admin (profile.role = 'admin')
//   2. Send a Supabase magic-link invite to the target email (creates auth.users row)
//   3. Insert/upsert profiles row with role='client'
//   4. Insert client_users row linking auth user → client + portal_role
//   5. Log an activity entry
//
// Idempotency: if the email already exists in auth, we skip the invite call
// and just ensure the profiles + client_users rows are in place. This makes
// it safe to "re-invite" or re-link an existing portal user to a new client.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SITE_URL = Deno.env.get('SITE_URL') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // ── 1. Verify caller is an authenticated admin ──────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ error: 'Missing Authorization header' }, 401);

    const { data: userRes, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userRes?.user) return json({ error: 'Invalid session' }, 401);
    const callerId = userRes.user.id;

    const { data: callerProfile, error: profileErr } = await admin
      .from('profiles').select('role').eq('id', callerId).single();
    if (profileErr || callerProfile?.role !== 'admin') {
      return json({ error: 'Forbidden — admin access required' }, 403);
    }

    // ── 2. Validate input ───────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const email = (body.email || '').trim().toLowerCase();
    const clientId = (body.client_id || '').trim();
    const portalRole = body.portal_role || 'viewer';

    if (!email || !email.includes('@')) return json({ error: 'Valid email required' }, 400);
    if (!clientId) return json({ error: 'client_id required' }, 400);
    if (!['owner', 'billing', 'viewer'].includes(portalRole)) {
      return json({ error: 'portal_role must be owner | billing | viewer' }, 400);
    }

    // Confirm the client exists
    const { data: client, error: clientErr } = await admin
      .from('clients').select('id, company').eq('id', clientId).single();
    if (clientErr || !client) return json({ error: 'Client not found' }, 404);

    // ── 3. Find or invite the auth user ─────────────────────────────────
    // listUsers doesn't support filtering by email directly in older SDK
    // versions, so we look it up via a paged search. For low user counts
    // this is fine; revisit if user count exceeds a few hundred.
    let authUserId: string | null = null;
    {
      const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const match = existing?.users?.find(u => u.email?.toLowerCase() === email);
      if (match) authUserId = match.id;
    }

    let invited = false;
    if (!authUserId) {
      const redirectTo = SITE_URL ? `${SITE_URL}/portal` : undefined;
      const { data: inviteRes, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { portal: true, client_id: clientId, portal_role: portalRole },
        redirectTo,
      });
      if (inviteErr || !inviteRes?.user) {
        return json({ error: `Invite failed: ${inviteErr?.message ?? 'unknown error'}` }, 500);
      }
      authUserId = inviteRes.user.id;
      invited = true;
    }

    // ── 4. Upsert profile (role='client') ───────────────────────────────
    // Don't downgrade an existing admin/user/contractor profile to 'client'.
    // Only set role='client' on a brand-new profile row.
    const { data: existingProfile } = await admin
      .from('profiles').select('id, role').eq('id', authUserId).maybeSingle();

    if (!existingProfile) {
      const { error: profileInsErr } = await admin.from('profiles').insert({
        id: authUserId,
        role: 'client',
        full_name: '',
      });
      if (profileInsErr) {
        return json({ error: `Profile create failed: ${profileInsErr.message}` }, 500);
      }
    }

    // ── 5. Upsert client_users row ──────────────────────────────────────
    // Use onConflict on the unique (auth_user_id, client_id) constraint so
    // re-inviting just updates the role/invited_at instead of erroring.
    const { error: linkErr } = await admin.from('client_users').upsert({
      auth_user_id: authUserId,
      client_id: clientId,
      portal_role: portalRole,
      invited_by: callerId,
      invited_at: new Date().toISOString(),
    }, { onConflict: 'auth_user_id,client_id' });

    if (linkErr) {
      return json({ error: `Link failed: ${linkErr.message}` }, 500);
    }

    // ── 6. Log activity ─────────────────────────────────────────────────
    await admin.from('activities').insert({
      type: 'portal',
      message: `Invited ${email} to ${client.company} portal (${portalRole})`,
      icon: 'user-plus',
    });

    return json({
      ok: true,
      invited,
      auth_user_id: authUserId,
      message: invited
        ? `Invite sent to ${email}`
        : `${email} already had an account — linked to ${client.company}`,
    });
  } catch (err) {
    console.error('invite-client-user error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
