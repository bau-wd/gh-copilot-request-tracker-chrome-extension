// popup.js

function easterSunday(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19*a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2*e + 2*i - h - k) % 7;
  const m = Math.floor((a + 11*h + 22*l) / 451);
  const month = Math.floor((h + l - 7*m + 114) / 31) - 1;
  const day   = ((h + l - 7*m + 114) % 31) + 1;
  return new Date(year, month, day);
}
function getHolidays(year) {
  const e = easterSunday(year);
  const add = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const key = d => d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();
  return new Set([
    new Date(year,0,1),new Date(year,0,6),add(e,1),new Date(year,4,1),
    add(e,39),add(e,50),add(e,60),new Date(year,7,15),new Date(year,9,26),
    new Date(year,10,1),new Date(year,11,8),new Date(year,11,25),new Date(year,11,26),
  ].map(key));
}
function isWorkDay(date, holidays) {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return false;
  return !holidays.has(date.getFullYear()+'-'+date.getMonth()+'-'+date.getDate());
}
function countWorkDays(from, to, holidays) {
  let n = 0; const d = new Date(from);
  while (d <= to) { if (isWorkDay(d, holidays)) n++; d.setDate(d.getDate()+1); }
  return n;
}
function barColor(pct) {
  if (pct > 90) return '#E24B4A';
  if (pct > 65) return '#EF9F27';
  return '#639922';
}

function render(usedPct, quota) {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth(), day = now.getDate();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const holidays = getHolidays(year);
  const monthStart = new Date(year, month, 1);
  const monthEnd   = new Date(year, month, daysInMonth);
  const today      = new Date(year, month, day);
  const yesterday  = new Date(year, month, day-1);
  const totalWork  = countWorkDays(monthStart, monthEnd, holidays);
  const passed     = day > 1 ? countWorkDays(monthStart, yesterday, holidays) : 0;
  const left       = countWorkDays(today, monthEnd, holidays);
  const todayWork  = isWorkDay(today, holidays);
  const monthPct   = totalWork > 0 ? Math.round(passed / totalWork * 100) : 0;
  const used       = quota * usedPct / 100;
  const remaining  = Math.max(0, quota - used);
  const dailyBudget = left > 0 ? remaining / left : 0;
  const priorIdeal = totalWork > 0 ? (quota / totalWork) * passed : 0;
  const usedToday  = Math.max(0, used - priorIdeal);
  const dailyPct   = Math.min(100, dailyBudget > 0 ? (usedToday / dailyBudget) * 100 : (todayWork ? 100 : 0));
  const monthUsed  = parseFloat(usedPct.toFixed(1));
  const idealLeft  = totalWork > 0 ? (quota / totalWork) * left : 0;
  const ahead      = remaining - idealLeft;
  const aheadAbs   = Math.round(Math.abs(ahead));
  const offNote    = !todayWork ? ' (today off)' : '';

  document.getElementById('month-bar').style.width = monthPct + '%';
  document.getElementById('month-lbl').textContent = monthPct + '%';
  document.getElementById('used-bar').style.width = monthUsed + '%';
  document.getElementById('used-bar').style.background = barColor(monthUsed);
  document.getElementById('used-lbl').textContent = monthUsed + '%';
  document.getElementById('daily-bar').style.width = dailyPct.toFixed(1) + '%';
  document.getElementById('daily-bar').style.background = barColor(dailyPct);
  document.getElementById('daily-lbl').textContent = dailyPct.toFixed(1) + '%';

  let state, msg;
  if (monthUsed > 90) {
    state = 'red';
    msg = ahead >= 0
      ? 'Running low — ' + Math.round(remaining) + ' requests left' + offNote + '.'
      : aheadAbs + ' requests behind pace' + offNote + '. Switch to a base model.';
  } else if (monthUsed > 65 || ahead < 0) {
    state = 'yellow';
    msg = ahead >= 0
      ? 'Ahead by ' + aheadAbs + ' requests' + offNote + ' — keep an eye on it.'
      : aheadAbs + ' requests behind pace' + offNote + '. Slow down a bit.';
  } else {
    state = 'green';
    msg = aheadAbs + ' requests ahead of pace — good shape' + offNote + '.';
  }
  const tipEl = document.getElementById('tip');
  tipEl.className = 'tip ' + state;
  tipEl.textContent = msg;

  const dayLabel = left + ' working day' + (left !== 1 ? 's' : '') + ' left' + (todayWork ? '' : ' (today off)');
  document.getElementById('cards').innerHTML =
    '<div class="mcard"><p class="mcard-label">Daily budget</p>' +
    '<p class="mcard-value accent">' + Math.round(dailyBudget) + '</p>' +
    '<p class="mcard-sub">' + dayLabel + '</p></div>' +
    '<div class="mcard"><p class="mcard-label">Used today (est.)</p>' +
    '<p class="mcard-value">' + Math.round(usedToday) + '</p>' +
    '<p class="mcard-sub">of ' + Math.round(dailyBudget) + ' (' + dailyPct.toFixed(1) + '%)</p></div>' +
    '<div class="mcard"><p class="mcard-label">Remaining</p>' +
    '<p class="mcard-value">' + Math.round(remaining) + '</p>' +
    '<p class="mcard-sub">of ' + quota + ' total</p></div>' +
    '<div class="mcard"><p class="mcard-label">Working days</p>' +
    '<p class="mcard-value">' + totalWork + '</p>' +
    '<p class="mcard-sub">' + passed + ' passed · ' + left + ' left</p></div>';
}

function updateSyncStatus(scrapedAt) {
  const dot = document.getElementById('sync-dot');
  const lbl = document.getElementById('sync-status');
  if (!scrapedAt) {
    dot.className = 'sync-dot';
    lbl.textContent = 'not synced';
    return;
  }
  const mins = Math.round((Date.now() - scrapedAt) / 60000);
  if (mins < 2)       { dot.className = 'sync-dot ok';   lbl.textContent = 'synced just now'; }
  else if (mins < 60) { dot.className = 'sync-dot ok';   lbl.textContent = 'synced ' + mins + 'm ago'; }
  else                { dot.className = 'sync-dot warn';  lbl.textContent = 'synced ' + Math.round(mins/60) + 'h ago'; }
}

// --- Sync button ---
let syncingTimer = null;
function setSyncing(on) {
  const btn  = document.getElementById('btn-sync');
  const icon = document.getElementById('sync-icon');
  if (on) {
    btn.classList.add('syncing');
    btn.disabled = true;
    icon.classList.add('spin');
    btn.childNodes[btn.childNodes.length - 1].textContent = ' Syncing…';
  } else {
    btn.classList.remove('syncing');
    btn.disabled = false;
    icon.classList.remove('spin');
    btn.childNodes[btn.childNodes.length - 1].textContent = ' Sync now';
  }
}

document.getElementById('btn-sync').addEventListener('click', () => {
  setSyncing(true);
  chrome.runtime.sendMessage({ type: 'SYNC_NOW' });
  // Timeout fallback if scrape never returns
  syncingTimer = setTimeout(() => setSyncing(false), 15000);
});

// --- Interval selector ---
document.getElementById('sync-interval').addEventListener('change', (e) => {
  const minutes = parseInt(e.target.value);
  chrome.storage.local.set({ syncInterval: minutes });
  chrome.runtime.sendMessage({ type: 'SET_INTERVAL', minutes });
});

// --- Manual input ---
document.getElementById('quota').addEventListener('input', () => {
  const quota   = Math.max(1, parseFloat(document.getElementById('quota').value) || 300);
  const usedPct = Math.min(100, Math.max(0, parseFloat(document.getElementById('used-pct').value) || 0));
  chrome.storage.local.set({ quota });
  render(usedPct, quota);
});
document.getElementById('used-pct').addEventListener('input', () => {
  const quota   = Math.max(1, parseFloat(document.getElementById('quota').value) || 300);
  const usedPct = Math.min(100, Math.max(0, parseFloat(document.getElementById('used-pct').value) || 0));
  manualEntry = true;
  chrome.storage.local.set({ usedPct });
  render(usedPct, quota);
});

// --- Storage changes (from content.js scrape or background) ---
// manualEntry: true when the user just typed in the field — prevents the
// storage.onChanged echo from overwriting the input with the old scraped value.
let manualEntry = false;

chrome.storage.onChanged.addListener((changes) => {
  chrome.storage.local.get(['usedPct', 'quota', 'scrapedAt', 'syncInterval'], (data) => {
    const pct   = data.usedPct ?? 0;
    const quota = data.quota   ?? 300;

    // Only update the % input when the change came from an auto-sync scrape,
    // not from the user typing (manualEntry flag) or a quota change.
    const syncedNow = changes.scrapedAt !== undefined;
    if (syncedNow || !manualEntry) {
      document.getElementById('used-pct').value = parseFloat(pct.toFixed(1));
      if (syncedNow) manualEntry = false; // a real sync overrides manual input
    }

    document.getElementById('quota').value = quota;
    updateSyncStatus(data.scrapedAt ?? null);
    render(pct, quota);
    if (syncingTimer) { clearTimeout(syncingTimer); syncingTimer = null; }
    setSyncing(false);
  });
});

// --- Init ---
chrome.storage.local.get(['usedPct', 'quota', 'scrapedAt', 'syncInterval'], (data) => {
  const pct      = data.usedPct      ?? 0;
  const quota    = data.quota        ?? 300;
  const interval = data.syncInterval ?? 60;

  document.getElementById('used-pct').value   = parseFloat(pct.toFixed(1));
  document.getElementById('quota').value      = quota;
  document.getElementById('sync-interval').value = String(interval);

  updateSyncStatus(data.scrapedAt ?? null);
  render(pct, quota);
});
