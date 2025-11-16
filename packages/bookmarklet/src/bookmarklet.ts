const API_BASE_URL = 'https://kinchaku.synology.me';

async function getToken() {
  let t = localStorage.getItem('kinchaku_auth');
  if (t) {
    try {
      t = JSON.parse(t);
      if ((t as any).token) return t;
    } catch {}
  }

  const e = prompt('Email:', 'demo@example.com');
  const p = prompt('Password:');
  if (!e || !p) return null;

  try {
    const r = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e, password: p }),
    });
    if (!r.ok) {
      alert('Login failed');
      return null;
    }
    t = await r.json();
    localStorage.setItem('kinchaku_auth', JSON.stringify(t));
    return t;
  } catch (e) {
    alert('Error: ' + (e instanceof Error ? e.message : 'Login failed'));
    return null;
  }
}

async function validateToken(t: any): Promise<string | null> {
  try {
    const r = await fetch(`${API_BASE_URL}/articles`, {
      headers: { Authorization: `Bearer ${t.token}` },
    });

    if (r.status === 401) {
      try {
        const nr = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: t.refreshToken }),
        });
        if (nr.ok) {
          const d = await nr.json();
          t.token = d.token;
          localStorage.setItem('kinchaku_auth', JSON.stringify(t));
          return t.token;
        }
      } catch {}
      localStorage.removeItem('kinchaku_auth');
      const nt = await getToken();
      return nt ? await validateToken(nt) : null;
    }
    return r.ok ? t.token : null;
  } catch {
    return null;
  }
}

(async () => {
  let t = localStorage.getItem('kinchaku_auth');
  t = t ? JSON.parse(t) : await getToken();
  if (!t) return;

  const tk = await validateToken(t);
  if (!tk) return;

  try {
    const r = await fetch(`${API_BASE_URL}/articles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tk}`,
      },
      body: JSON.stringify({
        url: window.location.href,
        archived: false,
        favorited: false,
      }),
    });
    alert(r.ok ? '✓ Saved!' : 'Failed to save');
  } catch {
    alert('Error saving URL');
  }
})();
