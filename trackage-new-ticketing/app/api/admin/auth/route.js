/* app/api/admin/auth/route.js
   POST { email, password } — verify admin credentials server-side.
   Returns { token } on success (the ADMIN_SECRET env var value).
   Credentials checked against ADMIN_EMAIL and ADMIN_PASSWORD (non-public env vars).
*/
export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const validEmail    = process.env.ADMIN_EMAIL;
    const validPassword = process.env.ADMIN_PASSWORD;
    const adminSecret   = process.env.ADMIN_SECRET;

    if (!validEmail || !validPassword || !adminSecret) {
      return Response.json({ error: 'Admin auth not configured' }, { status: 500 });
    }

    if (email === validEmail && password === validPassword) {
      return Response.json({ token: adminSecret });
    }

    return Response.json({ error: 'Invalid email or password' }, { status: 401 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
