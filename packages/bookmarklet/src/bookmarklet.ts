const API_BASE_URL = 'https://kinchaku.synology.me';

// Open auth popup and wait for credentials
async function getTokenViaPopup(): Promise<any> {
  return new Promise((resolve) => {
    const width = 450;
    const height = 600;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;

    const popup = window.open(
      `${API_BASE_URL}/auth/popup`,
      'kinchaku_auth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      alert('Please allow popups for this site to use the bookmarklet');
      resolve(null);
      return;
    }

    // Listen for auth data from popup
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== API_BASE_URL) return;
      if (event.data?.type === 'kinchaku_auth') {
        window.removeEventListener('message', messageHandler);
        resolve(event.data.data);
      }
    };

    window.addEventListener('message', messageHandler);

    // Check if popup was closed without auth
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        resolve(null);
      }
    }, 500);
  });
}

async function validateToken(token: string): Promise<string | null> {
  try {
    const r = await fetch(`${API_BASE_URL}/api/v1/articles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return r.ok ? token : null;
  } catch {
    return null;
  }
}

async function refreshToken(refreshToken: string): Promise<string | null> {
  try {
    const r = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (r.ok) {
      const data = await r.json();
      return data.token;
    }
  } catch {}
  return null;
}

(async () => {
  // Get auth from session storage (per-tab, temporary cache)
  let authData: any = null;
  const cached = sessionStorage.getItem('kinchaku_auth_cache');

  if (cached) {
    try {
      authData = JSON.parse(cached);
      // Validate cached token
      const valid = await validateToken(authData.token);
      if (!valid && authData.refreshToken) {
        // Try refresh
        const newToken = await refreshToken(authData.refreshToken);
        if (newToken) {
          authData.token = newToken;
          sessionStorage.setItem(
            'kinchaku_auth_cache',
            JSON.stringify(authData)
          );
        } else {
          authData = null;
        }
      } else if (!valid) {
        authData = null;
      }
    } catch {
      authData = null;
    }
  }

  // If no valid cached auth, open popup
  if (!authData) {
    authData = await getTokenViaPopup();
    if (!authData) return;

    // Cache in sessionStorage for this tab
    sessionStorage.setItem('kinchaku_auth_cache', JSON.stringify(authData));
  }

  try {
    const r = await fetch(`${API_BASE_URL}/api/v1/articles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authData.token}`,
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
