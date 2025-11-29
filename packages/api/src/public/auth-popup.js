const API_BASE_URL = window.location.origin;

function showError(message) {
  const errorEl = document.getElementById('error');
  errorEl.textContent = message;
  errorEl.classList.add('show');
}

function hideError() {
  const errorEl = document.getElementById('error');
  errorEl.classList.remove('show');
}

function showSuccess(message) {
  const successEl = document.getElementById('success');
  successEl.textContent = message;
  successEl.classList.add('show');
}

function showStatus(message) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.style.display = 'block';
}

function hideStatus() {
  const statusEl = document.getElementById('status');
  statusEl.style.display = 'none';
}

// Check if we already have a valid token
async function checkExistingAuth() {
  const authData = localStorage.getItem('kinchaku_auth');
  if (!authData) return false;

  try {
    const { token } = JSON.parse(authData);
    const response = await fetch(`${API_BASE_URL}/api/v1/articles`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      return true;
    }
  } catch (e) {
    console.error('Auth check failed:', e);
  }
  return false;
}

// Save bookmark using stored auth token
async function saveBookmark(url) {
  const authData = localStorage.getItem('kinchaku_auth');
  if (!authData) {
    throw new Error('Not authenticated');
  }

  const { token } = JSON.parse(authData);
  const response = await fetch(`${API_BASE_URL}/api/v1/articles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url,
      archived: false,
      favorited: false,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save bookmark [4]');
  }

  return response.json();
}

// Notify opener that bookmark was saved
function notifyOpener(success, message) {
  if (window.opener) {
    window.opener.postMessage(
      {
        type: 'kinchaku_bookmark_result',
        success,
        message,
      },
      '*'
    );
  }
}

// Get URL from query parameters
function getUrlToBookmark() {
  const params = new URLSearchParams(window.location.search);
  return params.get('url');
}

// Initialize
(async () => {
  const urlToBookmark = getUrlToBookmark();

  if (!urlToBookmark) {
    showError('No URL provided to bookmark');
    return;
  }

  // Check if already authenticated
  const isAuthenticated = await checkExistingAuth();
  if (isAuthenticated) {
    showStatus('Saving bookmark...');
    document.getElementById('loginForm').style.display = 'none';

    try {
      await saveBookmark(urlToBookmark);
      showSuccess('✓ Bookmark saved! Closing in 2 seconds...');
      hideStatus();
      notifyOpener(true, 'Bookmark saved successfully');
      setTimeout(() => window.close(), 2000);
    } catch (error) {
      showError(error.message || 'Failed to save bookmark [0]');
      hideStatus();
      notifyOpener(false, error.message || 'Failed to save bookmark [1]');
      setTimeout(() => window.close(), 3000);
    }
    return;
  }

  // Handle form submission
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    hideStatus();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = document.getElementById('submitBtn');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const authData = await response.json();

      // Store in localStorage for this domain
      localStorage.setItem('kinchaku_auth', JSON.stringify(authData));

      // Now save the bookmark
      submitBtn.textContent = 'Saving bookmark...';

      try {
        await saveBookmark(urlToBookmark);
        showSuccess('✓ Bookmark saved! Closing...');
        document.getElementById('loginForm').style.display = 'none';
        notifyOpener(true, 'Bookmark saved successfully');
        setTimeout(() => window.close(), 1500);
      } catch (bookmarkError) {
        showError(bookmarkError.message || 'Failed to save bookmark [3a]');
        notifyOpener(
          false,
          bookmarkError.message || 'Failed to save bookmark [3b]'
        );
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
        setTimeout(() => window.close(), 3000);
      }
    } catch (error) {
      showError(error.message || 'Login failed. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });
})();
