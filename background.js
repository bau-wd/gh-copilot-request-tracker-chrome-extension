// background.js — service worker

const ALARM_NAME = 'copilot-sync';
const SCRAPE_URL = 'https://github.com/settings/copilot';

// --- Holiday / working-day helpers (duplicated from popup.js, no imports in SW) ---
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
  const key = d => d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
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

// --- Badge ---
function updateBadge(usedPct, quota) {
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
  const used       = (quota * usedPct) / 100;
  const remaining  = Math.max(0, quota - used);
  const idealLeft  = totalWork > 0 ? (quota / totalWork) * left : 0;
  const ahead      = remaining - idealLeft;

  let color;
  if (usedPct > 90)              color = [226, 75, 74, 255];
  else if (usedPct > 65 || ahead < 0) color = [239, 159, 39, 255];
  else                            color = [99, 153, 34, 255];

  const text = usedPct >= 100 ? '!!' : Math.round(usedPct) + '%';
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeTextColor({ color: [255,255,255,255] });
}

// --- Auto-sync: open a background tab, let content.js scrape, close it ---
let syncTabId = null;

function doAutoSync() {
  // Don't open a second tab if one is already in progress
  if (syncTabId !== null) return;

  chrome.tabs.create({ url: SCRAPE_URL, active: false }, (tab) => {
    syncTabId = tab.id;

    // Safety timeout — close the tab after 15s even if scrape didn't fire
    setTimeout(() => {
      if (syncTabId !== null) {
        chrome.tabs.remove(syncTabId).catch(() => {});
        syncTabId = null;
      }
    }, 15000);
  });
}

// Listen for content.js writing to storage — that means scrape succeeded, close the tab
chrome.storage.onChanged.addListener((changes) => {
  if (changes.scrapedAt && syncTabId !== null) {
    chrome.tabs.remove(syncTabId).catch(() => {});
    syncTabId = null;
  }

  // Always refresh badge on any storage change
  chrome.storage.local.get(['usedPct', 'quota'], (data) => {
    updateBadge(data.usedPct ?? 0, data.quota ?? 300);
  });
});

// --- Alarm management ---
function setupAlarm(intervalMinutes) {
  chrome.alarms.clear(ALARM_NAME, () => {
    if (intervalMinutes > 0) {
      chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: intervalMinutes,
        periodInMinutes: intervalMinutes,
      });
    }
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) doAutoSync();
});

// On install / startup: restore alarm from saved settings and init badge
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['syncInterval', 'usedPct', 'quota'], (data) => {
    setupAlarm(data.syncInterval ?? 60);
    updateBadge(data.usedPct ?? 0, data.quota ?? 300);
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['syncInterval', 'usedPct', 'quota'], (data) => {
    setupAlarm(data.syncInterval ?? 60);
    updateBadge(data.usedPct ?? 0, data.quota ?? 300);
  });
});

// Message from popup to trigger immediate sync or change interval
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SYNC_NOW') doAutoSync();
  if (msg.type === 'SET_INTERVAL') setupAlarm(msg.minutes);
});
