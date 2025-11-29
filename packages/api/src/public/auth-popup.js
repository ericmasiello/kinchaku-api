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

// Send auth data to the opener window
function sendAuthToOpener(authData) {
  if (window.opener) {
    window.opener.postMessage(
      {
        type: 'kinchaku_auth',
        data: authData,
      },
      '*'
    );
  }
}

// Initialize
(async () => {
  // Check if already authenticated
  const isAuthenticated = await checkExistingAuth();
  if (isAuthenticated) {
    const authData = JSON.parse(localStorage.getItem('kinchaku_auth'));
    showSuccess('✓ Already signed in! Closing in 2 seconds...');
    document.getElementById('loginForm').style.display = 'none';
    sendAuthToOpener(authData);
    setTimeout(() => window.close(), 2000);
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

      // Send to opener window
      sendAuthToOpener(authData);

      // Show success and close
      showSuccess('✓ Signed in successfully! Closing...');
      document.getElementById('loginForm').style.display = 'none';

      setTimeout(() => window.close(), 1500);
    } catch (error) {
      showError(error.message || 'Login failed. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });
})();
