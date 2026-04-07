# Copilot Budget Tracker

A Chrome extension that tracks your **GitHub Copilot premium request usage** with working-day budgeting and automatic syncing.

---

## Features

- **Auto-sync** — opens a background tab on `github.com/settings/copilot` on a configurable schedule (every 30 min / 1 h / 3 h / 6 h) and scrapes your current usage percentage automatically.
- **Manual sync** — one-click "Sync now" button for instant updates.
- **Working-day budget** — distributes your monthly quota evenly across working days only (weekends and Austrian public holidays excluded).
- **Daily budget card** — shows how many premium requests you can still use today.
- **Estimated daily usage** — estimates how many requests you have used today based on the daily pace.
- **Progress bars** — visual bars for working-day progress, monthly quota used, and today's allowance used.
- **Color-coded status tip** — green / yellow / red advice based on whether you're ahead of or behind pace.
- **Toolbar badge** — displays your current usage percentage at a glance, color-coded (green → yellow → red).
- **Persistent settings** — quota and sync interval are saved in local storage and restored across sessions.
- **Monthly reset** — quota resets on the 1st of each month at 00:00 UTC.

---

## Installation

> The extension is not yet published to the Chrome Web Store. Install it manually as an unpacked extension.

1. **Download or clone** this repository to your machine:
   ```bash
   git clone https://github.com/bau-wd/gh-copilot-request-tracker-chrome-extension.git
   ```

2. Open Chrome and navigate to `chrome://extensions`.

3. Enable **Developer mode** (toggle in the top-right corner).

4. Click **Load unpacked** and select the repository folder.

5. The **Copilot Budget** icon will appear in your toolbar.

---

## Usage

1. **Click the toolbar icon** to open the popup.

2. **Set your monthly quota** — enter the total number of premium requests in your Copilot plan (default: 300).

3. **Sync your usage** — click **Sync now** or let auto-sync do it automatically. The extension navigates to your GitHub Copilot settings page in the background and reads the current usage percentage.

4. **Read your dashboard:**
   | Section | Description |
   |---|---|
   | **Daily budget** | Remaining requests ÷ remaining working days |
   | **Used today (est.)** | Estimated requests consumed today |
   | **Remaining** | Total requests left for the month |
   | **Working days** | Total, passed, and remaining working days |
   | **Working day progress bar** | How far through the working month you are |
   | **Monthly quota used bar** | What percentage of your quota is consumed |
   | **Today's allowance used bar** | How much of today's budget you've spent |

5. **Configure auto-sync** — use the dropdown to set the sync interval, or turn it off entirely.

---

## Permissions

| Permission | Reason |
|---|---|
| `storage` | Persists quota, usage data, and settings locally |
| `alarms` | Schedules background auto-sync |
| `tabs` | Opens a background tab to scrape GitHub settings |
| `https://github.com/*` | Reads usage data from your GitHub Copilot/billing settings pages |

No data is ever sent to any external server. Everything stays in your browser's local storage.

---

## How It Works

```
┌──────────────┐   Sync now / alarm   ┌───────────────────┐
│  popup.js    │ ──────────────────►  │  background.js    │
│  (UI)        │                      │  (service worker) │
└──────────────┘                      └────────┬──────────┘
                                               │ opens background tab
                                               ▼
                                      ┌───────────────────┐
                                      │   content.js      │
                                      │  (scraper)        │
                                      │  github.com/      │
                                      │  settings/copilot │
                                      └────────┬──────────┘
                                               │ chrome.storage.local.set(usedPct)
                                               ▼
                                      ┌───────────────────┐
                                      │  chrome.storage   │
                                      │  .local           │
                                      └────────┬──────────┘
                                               │ onChanged → update badge & popup
                                               ▼
                                      ┌───────────────────┐
                                      │  Toolbar badge    │
                                      │  + popup render   │
                                      └───────────────────┘
```

1. **`background.js`** (service worker) — manages the sync alarm, opens a hidden tab to trigger scraping, and updates the toolbar badge.
2. **`content.js`** — injected on `github.com/settings/copilot` and `github.com/settings/billing`. Uses three progressive CSS-selector strategies to extract the usage percentage from the GitHub UI and writes it to `chrome.storage.local`.
3. **`popup.js`** — reads stored data, computes working-day budgeting metrics, and renders the popup UI in real time.

---

## Holiday Calendar

Working-day calculations exclude **Austrian public holidays**:

| Date | Holiday |
|---|---|
| 1 Jan | New Year's Day |
| 6 Jan | Epiphany |
| Easter Monday | (calculated) |
| 1 May | Labour Day |
| Ascension Thursday | (Easter + 39 days) |
| Whit Monday | (Easter + 50 days) |
| Corpus Christi | (Easter + 60 days) |
| 15 Aug | Assumption of Mary |
| 26 Oct | Austrian National Day |
| 1 Nov | All Saints' Day |
| 8 Dec | Immaculate Conception |
| 25 Dec | Christmas Day |
| 26 Dec | St. Stephen's Day |

---

## File Structure

```
├── manifest.json      # Extension manifest (Manifest V3)
├── background.js      # Service worker: alarm, auto-sync, badge
├── content.js         # Scraper injected on GitHub settings pages
├── popup.html         # Popup markup and styles
├── popup.js           # Popup logic and budgeting calculations
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Contributing

Pull requests are welcome. Please open an issue first to discuss what you would like to change.

---

## License

[MIT](LICENSE)
