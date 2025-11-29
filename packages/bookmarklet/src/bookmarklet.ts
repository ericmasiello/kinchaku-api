const API_BASE_URL = 'https://kinchaku.synology.me';

// Open auth popup with URL to bookmark and wait for result
async function saveViaPopup(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const width = 450;
    const height = 600;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;

    const encodedUrl = encodeURIComponent(url);
    const popup = window.open(
      `${API_BASE_URL}/auth/popup?url=${encodedUrl}`,
      'kinchaku_auth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      alert('Please allow popups for this site to use the bookmarklet');
      resolve(false);
      return;
    }

    // Listen for bookmark result from popup
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== API_BASE_URL) return;
      if (event.data?.type === 'kinchaku_bookmark_result') {
        window.removeEventListener('message', messageHandler);
        resolve(event.data.success);
      }
    };

    window.addEventListener('message', messageHandler);

    // Check if popup was closed without result
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        resolve(false);
      }
    }, 500);
  });
}

(async () => {
  const url = window.location.href;
  const success = await saveViaPopup(url);

  if (success) {
    alert('✓ Saved!');
  } else {
    alert('Failed to save bookmark');
  }
})();
