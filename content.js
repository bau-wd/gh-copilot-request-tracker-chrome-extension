// content.js — runs on github.com/settings/copilot and /settings/billing
// Scrapes premium request usage % from the GitHub UI.

(function () {
  function scrape() {
    let pct = null;

    // Strategy 1 (precise): the div#copilot-overages-usage structure
    // <span class="Progress-item"> has style="width: X%;"
    const progressItem = document.querySelector(
      '#copilot-overages-usage .Progress-item, #copilot_overages_progress_bar .Progress-item'
    );
    if (progressItem) {
      const style = progressItem.getAttribute('style') || '';
      const match = style.match(/width:\s*([\d.]+)%/);
      if (match) {
        pct = parseFloat(parseFloat(match[1]).toFixed(2));
      }
    }

    // Strategy 2: the sibling text div next to "Premium requests" label
    // <span class="text-bold">Premium requests</span> ... <div>5.0%</div>
    if (pct === null) {
      const labels = document.querySelectorAll('span.text-bold');
      for (const label of labels) {
        if (/premium\s+requests/i.test(label.textContent)) {
          // the % is in a sibling div within the same flex row
          const row = label.closest('div');
          if (row) {
            const pctDiv = row.querySelector('div:last-child');
            if (pctDiv) {
              const match = pctDiv.textContent.trim().match(/^([\d.]+)%$/);
              if (match) {
                pct = parseFloat(parseFloat(match[1]).toFixed(2));
                break;
              }
            }
          }
        }
      }
    }

    // Strategy 3: broad fallback — any Progress-item with a width% style
    // in a section that mentions "premium" or "copilot"
    if (pct === null) {
      const items = document.querySelectorAll('.Progress-item[style]');
      for (const item of items) {
        const section = item.closest('li, section, [id*="copilot"], [id*="overage"]');
        if (section && /premium|copilot/i.test(section.textContent)) {
          const style = item.getAttribute('style') || '';
          const match = style.match(/width:\s*([\d.]+)%/);
          if (match) {
            pct = parseFloat(parseFloat(match[1]).toFixed(2));
            break;
          }
        }
      }
    }

    if (pct !== null) {
      chrome.storage.local.set({
        usedPct: Math.min(100, Math.max(0, pct)),
        scrapedAt: Date.now(),
        url: location.href,
      });
      showToast('Copilot Budget synced — ' + pct.toFixed(1) + '% used');
    }
  }

  function showToast(msg) {
    const existing = document.getElementById('__copilot_budget_toast__');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = '__copilot_budget_toast__';
    toast.textContent = msg;
    Object.assign(toast.style, {
      position: 'fixed', bottom: '20px', right: '20px', zIndex: '99999',
      background: '#1c1c1a', color: '#c0dd97', padding: '10px 16px',
      borderRadius: '8px', fontSize: '13px', fontFamily: 'system-ui, sans-serif',
      boxShadow: '0 2px 12px rgba(0,0,0,0.3)', opacity: '1',
      transition: 'opacity 0.4s ease',
    });
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; }, 3000);
    setTimeout(() => { toast.remove(); }, 3500);
  }

  // Run after a short delay to allow React/SPA content to render
  setTimeout(scrape, 1200);

  // Re-run on GitHub SPA navigation
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(scrape, 1200);
    }
  }).observe(document.body, { childList: true, subtree: true });
})();
