/* lib/adminAuth.js
   Server-side helper — verifies admin Bearer token on API routes.
   Usage:
     const authError = checkAdminAuth(req);
     if (authError) return authError;
*/
export function checkAdminAuth(req) {
  const token  = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const secret = process.env.ADMIN_SECRET;

  if (!secret) {
    return Response.json({ error: 'Admin auth not configured' }, { status: 500 });
  }
  if (!token || token !== secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null; // auth passed
}
