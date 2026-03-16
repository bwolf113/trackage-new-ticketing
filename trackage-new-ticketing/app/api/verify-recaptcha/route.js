/* app/api/verify-recaptcha/route.js */
export async function POST(req) {
  try {
    const { token } = await req.json();
    if (!token) return Response.json({ success: false, error: 'Missing token' }, { status: 400 });

    const secret = process.env.RECAPTCHA_SECRET_KEY;
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secret}&response=${token}`,
    });
    const data = await res.json();

    if (!data.success) {
      return Response.json({ success: false, error: 'reCAPTCHA verification failed' }, { status: 400 });
    }
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
