/* app/api/admin/save-note/route.js
   POST { order_id, type: 'private'|'public', content }
   Public notes are also emailed to the customer.
*/
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '../../../../lib/sendEmail';
import { checkAdminAuth } from '../../../../lib/adminAuth';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export async function POST(req) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;
  try {
    const { order_id, type, content } = await req.json();
    if (!order_id || !type || !content?.trim()) {
      return Response.json({ error: 'order_id, type and content required' }, { status: 400 });
    }
    if (!['private', 'public'].includes(type)) {
      return Response.json({ error: 'type must be private or public' }, { status: 400 });
    }

    const supabase = adminSupabase();

    const field = type === 'private' ? 'admin_note' : 'public_note';
    const { error } = await supabase.from('orders')
      .update({ [field]: content.trim(), updated_at: new Date().toISOString() })
      .eq('id', order_id);

    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Email customer for public notes
    if (type === 'public') {
      const { data: order } = await supabase
        .from('orders')
        .select('customer_name, customer_email, events(name)')
        .eq('id', order_id)
        .single();

      if (order?.customer_email) {
        const orderRef = order_id.slice(0, 8).toUpperCase();
        const name     = order.customer_name || 'there';
        const event    = order.events?.name || 'your event';

        await sendEmail({
          to: order.customer_email,
          subject: `Message from Trackage Scheme — Order #${orderRef}`,
          html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f3;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
<tr><td style="background:#0a0a0a;padding:20px 28px">
  <p style="margin:0;font-size:16px;font-weight:700;color:#fff">Trackage Scheme</p>
  <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:0.1em;text-transform:uppercase">Above ground is overrated</p>
</td></tr>
<tr><td style="padding:28px 28px">
  <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#111">Hi ${name},</p>
  <p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.6">
    You have a message from the Trackage Scheme team regarding your order <strong>#${orderRef}</strong> for <strong>${event}</strong>:
  </p>
  <div style="background:#f9f9f9;border-left:3px solid #0a9e7f;border-radius:0 6px 6px 0;padding:14px 18px;margin:0 0 20px;font-size:14px;color:#1a1a1a;line-height:1.6">${escapeHtml(content.trim()).replace(/\n/g, '<br>')}</div>
  <p style="margin:0;font-size:13px;color:#999">If you have any questions, reply to this email or contact us at <a href="mailto:team@trackagescheme.com" style="color:#0a9e7f">team@trackagescheme.com</a>.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`,
        });
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
