/* app/organiser/auth/callback/page.jsx
   Handles OAuth redirect. Exchanges code for session, creates organiser profile.
*/
'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';

function AuthCallbackPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Signing you in…');

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    // If this is a password recovery redirect, hand off to the reset-password page
    // Supabase appends type=recovery in the URL hash or as a query param
    const type = searchParams.get('type');
    if (type === 'recovery') {
      router.replace('/organiser/reset-password');
      return;
    }
    // Also check the hash fragment (implicit flow recovery links)
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      router.replace('/organiser/reset-password' + window.location.hash);
      return;
    }

    const code = searchParams.get('code');

    if (code) {
      // PKCE flow — exchange code for session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data.session) {
        setStatus('Authentication failed. Redirecting…');
        setTimeout(() => router.push('/organiser/login?error=auth_failed'), 1500);
        return;
      }
      await finishLogin(data.session);
      return;
    }

    // Implicit flow / existing session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await finishLogin(session);
    } else {
      setStatus('No session found. Redirecting…');
      setTimeout(() => router.push('/organiser/login'), 1500);
    }
  }

  async function finishLogin(session) {
    setStatus('Setting up your profile…');
    try {
      const res  = await fetch('/api/organiser/me', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: session.user.user_metadata?.full_name || session.user.email,
        }),
      });
      const json = await res.json();
      if (json.organiser) {
        localStorage.setItem('organiser_id',   json.organiser.id);
        localStorage.setItem('organiser_name', json.organiser.name);
        router.push('/organiser');
      } else {
        setStatus('Profile setup failed. Redirecting…');
        setTimeout(() => router.push('/organiser/login?error=profile_failed'), 1500);
      }
    } catch {
      setStatus('An error occurred. Redirecting…');
      setTimeout(() => router.push('/organiser/login'), 1500);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif', background: '#f9fafb', color: '#111827',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{status}</div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>Please wait…</div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallbackPageInner />
    </Suspense>
  );
}
