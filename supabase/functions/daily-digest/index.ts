// Thymely — daily email digest Edge Function (Deno / Supabase Functions)
//
// Sends each gardener an email listing the tasks due today. Triggered daily by
// pg_cron (see supabase/migrations/0005_daily_digest_cron.sql), or manually:
//   supabase functions invoke daily-digest
//
// Deploy:
//   supabase functions deploy daily-digest
// Secrets required (supabase secrets set ...):
//   RESEND_API_KEY  — from https://resend.com (free tier: 100 emails/day)
//   FROM_EMAIL      — a verified sender, e.g. "Thymely <care@yourdomain.com>"
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// NOTE: This is a working skeleton. It assumes Phase 2 (auth) so it can map
// owners -> email addresses via auth.users. In Phase 1 (single implicit profile)
// there is no email on file, so the function simply reports 0 recipients.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface DueTask {
  owner_id: string;
  title: string;
  next_due_date: string;
}

Deno.serve(async (_req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'Thymely <onboarding@resend.dev>';

  const supabase = createClient(supabaseUrl, serviceKey);

  const today = new Date().toISOString().slice(0, 10);

  // Tasks due on/before today, grouped by owner.
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('owner_id, title, next_due_date')
    .eq('active', true)
    .lte('next_due_date', today);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const byOwner = new Map<string, DueTask[]>();
  for (const t of (tasks ?? []) as DueTask[]) {
    const list = byOwner.get(t.owner_id) ?? [];
    list.push(t);
    byOwner.set(t.owner_id, list);
  }

  let sent = 0;
  const skipped: string[] = [];

  for (const [ownerId, dueTasks] of byOwner) {
    // Resolve the owner's email via the auth admin API (Phase 2).
    const { data: userRes } = await supabase.auth.admin.getUserById(ownerId);
    const email = userRes?.user?.email;
    if (!email) {
      skipped.push(ownerId);
      continue;
    }

    const lines = dueTasks.map((t) => `<li>${escapeHtml(t.title)}</li>`).join('');
    const html = `
      <div style="font-family: system-ui, sans-serif;">
        <h2>🌿 Thymely — ${dueTasks.length} task(s) due today</h2>
        <ul>${lines}</ul>
        <p style="color:#6b7280;font-size:12px;">Garden care on schedule.</p>
      </div>`;

    if (!resendApiKey) {
      skipped.push(`${ownerId} (no RESEND_API_KEY)`);
      continue;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: `🌿 ${dueTasks.length} plant task(s) due today`,
        html,
      }),
    });
    if (res.ok) sent += 1;
  }

  return new Response(
    JSON.stringify({ ok: true, recipients: byOwner.size, sent, skipped }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
