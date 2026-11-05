# 🪙 Pocket Ledger

> **Your money, in focus.** A modern, offline-first personal expense tracker and peer-to-peer ledger built for clarity, speed, and real-world developer workflows.

Pocket Ledger combines daily expense tracking, multi-context segmentation (Personal, Developer, Office, and custom spheres), conference and trip event tagging, and person-to-person debt tracking into a cohesive, warm editorial mobile and web application.

---

## ✨ Key Features

### 📊 1. Home Dashboard & Insights
- **Monthly Spend Hero**: Live computation of total expenses, today's spending, and total entries formatted in Indian Rupees (`₹`).
- **Interactive Donut Chart**: Dynamic SVG donut visualization segmented by category colors.
- **Context Drill-Down**: Tap any category in the breakdown legend to inspect spending split across spheres (e.g., how much of *Food* was *Personal* vs. *Office* vs. *Developer*).
- **Recent Feed**: Instant snapshot of the latest 4 transactions with status tags, context badges, and quick-read visual cues.

### 💻 2. Developer & Event Spotlight
- **Tech Spending Aggregator**: Dedicated spotlight that monitors and aggregates tech, tools, and developer-related expenses.
- **Event & Conference Tagging**: Tag transactions with trip or conference tags (e.g., `#DevFest`, `#Hackathon2026`).
- **Unified Event Costs**: Automatically rolls up event expenses and displays a category-by-category breakdown for every trip or hackathon.

### 🌐 3. Context Spheres (Multi-Sphere Accounting)
- Preloaded with **Personal**, **Developer**, and **Office** spheres.
- **Custom Contexts**: Create custom spheres on the fly (e.g., *Freelance*, *College*, *Startup*) with custom icons and local persistence.
- Easily toggle contexts when adding expenses or filtering activity.

### ⚡ 5. Smart SMS & UPI Transaction Parser (paused)
> SMS import and capture are disabled in the current app. The parser is retained for future use; use Gmail drafts or manual entry instead.

- **Zero-Manual-Entry Mode**: Simply copy or paste any bank or UPI transactional SMS (from PhonePe, Google Pay, Paytm, HDFC, SBI, ICICI, Axis, etc.).
- **Automatic Entity Extraction**: Automatically extracts Amount, Inflow vs Outflow, Merchant / Payee, Bank Account / Card endings, and Transaction Reference.
- **Smart Category Inference**: Automatically maps known merchants (Swiggy, Zomato, Starbucks $\rightarrow$ *Food*; Uber, Ola, IRCTC $\rightarrow$ *Transport*; AWS, GitHub, Vercel $\rightarrow$ *Developer*; Amazon, Flipkart $\rightarrow$ *Shopping*).
- **Clipboard 1-Tap Paste**: Automatically reads and parses copied SMS text directly from the device clipboard.
- **Batch SMS Import**: Paste an entire message thread to parse and bulk-import multiple transactions simultaneously.

### 👥 6. People & PhonePe UPI Settlement ("Money Between You")
- **Automated Balance Tracking**: Tag any expense or received amount with a person's name (e.g., *Rahul*, *Priya*).
- **Zero-Math Settlement**: Automatically determines net balances (`owes you`, `you owe`, `settled`).
- **1-Tap PhonePe Direct Payment**: When you owe someone money, tap **"Pay via PhonePe"** to open PhonePe with the recipient's UPI ID, name, amount, and note pre-filled.
- **Settle Upon Payment**: Returning to Pocket Ledger automatically asks if the payment was completed to record the repayment without manual entry.
- **UPI Payment Request Sharing**: When someone owes you money, tap **"Request via WhatsApp"** to generate an instant payment link with your personal UPI ID.
- **Contact & Profile UPI Storage**: Save UPI IDs for individual contacts and configure your personal UPI ID for seamless reconciliation.

### 📝 7. Streamlined Expense Entry & Customization
- **Flexible Flow**: Mark transactions as `"I paid"` (expense) or `"I received"` (repayment / income).
- **Date Picking**: One-tap date selection for *Today*, *Yesterday*, or custom dates via an interactive calendar modal.
- **Custom Categories**: Built-in categories (*Food*, *Transport*, *Developer*, *Home*, *Shopping*, *Health*, *Other*) plus the ability to create new categories with a custom color palette.
- **Haptic Feedback**: Native tactile response on transaction saves and destructive actions.

### 📜 8. Activity & Filterable Ledger
- **Context Filters**: Seamlessly filter all past transactions by *All*, *Personal*, *Developer*, *Office*, or any custom sphere.
- **Event Filter**: Filter by clicking any `#event` tag to calculate the exact subtotal for that event.
- **Platform-Native Deletion**: Long-press or action icon to delete with native alerts on iOS/Android and immediate removal on Web.
- **Pull to Refresh**: Manual sync/reload control on all list views.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [React Native 0.86.3](https://reactnative.dev/) / [Expo SDK 57](https://expo.dev/) (New Architecture Enabled) |
| **Routing** | [Expo Router v57](https://docs.expo.dev/router/introduction/) (File-based routing with typed routes & React Compiler) |
| **Language** | [TypeScript ~5.9.2](https://www.typescriptlang.org/) (Strict mode) |
| **Local Storage** | [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) (`pocket-ledger.db`) with fallback to [@react-native-async-storage/async-storage](https://react-native-async-storage.github.io/async-storage/) on Web |
| **Icons & Design** | `@expo/vector-icons` (Feather), `expo-symbols` (SF Symbols on iOS), `expo-blur` |
| **Typography** | `@expo-google-fonts/inter` (Inter 400, 500, 600, 700) |
| **Keyboard Management** | `react-native-keyboard-controller` with web fallback |
| **Data Fetching / State** | React Context (`ExpenseContext`) + `@tanstack/react-query` |
| **Haptics** | `expo-haptics` |

---

## 🗄️ Database & Storage Schema

Pocket Ledger uses a local SQLite database on native platforms with automatic schema creation and non-destructive migrations. On web environments, it seamlessly falls back to AsyncStorage with identical data shapes.

### Database Name: `pocket-ledger.db`

#### 1. `expenses` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY NOT NULL` | Unique ID (`timestamp-randomHash`) |
| `amount` | `REAL` | `NOT NULL` | Monetary value |
| `category` | `TEXT` | `NOT NULL` | Category name (e.g. `Food`, `Developer`) |
| `note` | `TEXT` | `NOT NULL` | Description or notes |
| `date` | `TEXT` | `NOT NULL` | ISO 8601 Date string |
| `direction` | `TEXT` | `NOT NULL DEFAULT 'spent'` | `'spent'` or `'received'` |
| `person` | `TEXT` | `NOT NULL DEFAULT ''` | Associated person's name |
| `sub_context` | `TEXT` | `NOT NULL DEFAULT 'Personal'` | Sphere (`Personal`, `Developer`, `Office`, etc.) |
| `event_tag` | `TEXT` | `NOT NULL DEFAULT ''` | Conference, trip, or event tag |

#### 2. `custom_categories` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `key` | `TEXT` | `PRIMARY KEY NOT NULL` | Unique category key |
| `label` | `TEXT` | `NOT NULL` | Display label |
| `icon` | `TEXT` | `NOT NULL` | Feather icon identifier |
| `color` | `TEXT` | `NOT NULL` | Hex color code |

#### 3. `custom_sub_contexts` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `key` | `TEXT` | `PRIMARY KEY NOT NULL` | Unique context key |
| `label` | `TEXT` | `NOT NULL` | Display label |
| `icon` | `TEXT` | `NOT NULL` | Feather icon identifier |

---

## 📁 Project Structure

```
Pocket-Ledger/
├── app/                                # Expo Router file-based screens
│   ├── (tabs)/                         # Bottom Tab Navigator
│   │   ├── _layout.tsx                 # Tab navigation bar with platform blur & SF symbols
│   │   ├── index.tsx                   # Home dashboard (Hero, Donut chart, Dev spotlight, FAB)
│   │   ├── activity.tsx                # Transaction ledger with sphere & event filtering
│   │   └── people.tsx                  # People ledger & bilateral balance tracking
│   ├── _layout.tsx                     # Root application layout (Providers, Fonts, ErrorBoundary)
│   └── +not-found.tsx                  # Fallback 404 screen
├── assets/                             # App branding & iconography
│   └── images/
│       ├── icon.png                    # Primary launcher and splash icon
│       └── icon_2.png                  # Alternate asset
├── components/                         # Shared UI and utility components
│   ├── ErrorBoundary.tsx               # Class component error boundary
│   ├── ErrorFallback.tsx               # User-facing error screen with dev stack viewer
│   └── KeyboardAwareScrollViewCompat.tsx # Cross-platform keyboard scroll helper
├── constants/
│   └── colors.ts                       # Semantic theme tokens & color definitions
├── context/
│   └── ExpenseContext.tsx              # SQLite engine, state management, and CRUD methods
├── hooks/
│   └── useColors.ts                    # Hook returning tokens based on light/dark mode
├── app.json                            # Expo application configuration & plugins
├── eas.json                            # Expo Application Services (EAS) build profiles
├── metro.config.js                     # Metro bundler configuration
├── package.json                        # Dependencies and scripts
└── tsconfig.json                       # TypeScript path aliases (`@/*`) and configuration
```

---

## 🎨 Design System

Pocket Ledger uses a refined, editorial color palette designed to avoid sterile spreadsheet aesthetics:

| Token | Hex Value | Role |
|---|---|---|
| **Background** | `#F7F4EC` | Warm parchment background surface |
| **Foreground / Text** | `#19332F` | Deep forest pine for text and strong accents |
| **Primary / Tint** | `#F06F58` | Warm coral for primary buttons, received highlights, and accents |
| **Card** | `#FFFDF8` | Slightly elevated warm ivory surface |
| **Developer Highlight** | `#6366F1` | Indigo used for developer tags, badges, and event cards |
| **Border / Input** | `#DDD9D0` / `#D7D2C8` | Subtle warm grey outlines |
| **Radius** | `18px - 24px` | Soft, modern rounded corners |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or later recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo Go](https://expo.dev/go) on your iOS/Android device, or a configured Android/iOS simulator

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/NavadeepDj/Pocket-Ledger.git
   cd Pocket-Ledger
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Run on a specific platform:**
   - Press `a` in the terminal to run on an **Android** emulator or connected device.
   - Press `i` in the terminal to run on an **iOS** simulator (macOS only).
   - Press `w` in the terminal to run in a **Web** browser.
   - Scan the terminal QR code using **Expo Go** on Android or Camera app on iOS.

### Type Checking
To verify TypeScript types across the project:
```bash
npm run typecheck
```

### Automatic payment drafts (Android)

Open **Home > Payment drafts** to connect Gmail or enable **Payment notifications**.
Notification access opens Android settings and is off by default. Bank SMS is paused:
its receiver is disabled, RECEIVE_SMS is not declared, native capture rejects SMS, and
manual SMS entry points are disabled. Existing ledger entries and drafts are retained.

Payment alerts are filtered and queued locally by the native Android module even when JavaScript
is not running. When the app is opened, the queue is parsed into persistent drafts. While the
app is active it checks for new alerts every five seconds. Review a draft to edit the amount,
note, direction, category, sphere, event tag or person; the imported date is preserved, then choose **Add to ledger** or
**Dismiss**. Drafts never affect totals before confirmation.

Alerts with the same reference, amount and direction are combined. Similar alerts without a
shared reference remain separate with a possible-duplicate warning. Added and dismissed draft
fingerprints are retained locally to prevent late alerts from recreating them. Pending drafts
remain until reviewed. The native queue retains up to 500 alerts, for up to 30 days. Nothing is
uploaded by this feature.

Supported notification packages currently include PhonePe, Google Pay, Paytm, BHIM, CRED,
Amazon, Slice, SBI, HDFC/PayZapp, ICICI, Axis and Kotak. Capture depends on the alert containing an explicit payment action and amount. OTPs,
requests, pending/failed payments and reminders are filtered out. Alerts are suggestions, not
bank verification. Force-stopping the app, revoking access, or some manufacturers' battery
restrictions can interrupt capture. Reopen the app and check source status if drafts stop arriving.

**Requires a newly built Android app; this native module does not run inside Expo Go.**
Build an APK using the preview command below, or use `npx expo run:android` with a local
Android SDK. The module lives in `modules/payment-capture` and Expo autolinks it during prebuild.
Gmail and notification capture are Android-only. SMS parser code remains in the repository,
but SMS functionality is disabled in the current app.

#### Installing a personal update when Play Protect blocks a downloaded APK

Google Play Protect can block browser/file-manager installations that declare SMS or
notification-listener access. Turning capture off inside the app does not remove these
manifest declarations. See [Google's explanation](https://developers.google.com/android/play-protect/warning-dev-guidance).

For development or personal testing, connect your phone with USB debugging enabled and
install the original signed release APK from your computer:

```bash
adb devices
adb install -r path/to/pocket-ledger.apk
```

Use the same application ID (`com.navadeepdj.pocketledger`) and signing certificate as the
installed app. The `-r` option retains existing app data; do not uninstall or clear data to
resolve an update problem. This installation method worked for the release update tested
on November 5, 2026, with Play Protect left enabled.

After installation, the release APK runs independently of USB and Metro. Open **Payment
drafts** to connect Gmail or enable notification access. Future personal
updates can use the same ADB command. For distribution to other users, pursue Google Play's
reviewed distribution process or the Play Protect appeal linked in Google's guidance;
USB installation does not resolve the browser-download block for other users.

Run parser and duplicate/retry checks with:

```bash
npm run test:services
```

Payment capture supports Slice (`indwin.c3.shareapp`) and PhonePe notifications; bank SMS is paused. The drafts screen distinguishes permission access from an active notification
listener, includes setup troubleshooting, and confirms dismissal. Notification callbacks
recover still-active alerts after reconnecting; this does not recover dismissed notifications
or scan historical SMS. Bank alert thresholds and payments with no readable alert still
require manual entry. Captured alerts are processed into reviewable drafts when the app runs.

On an Android device, verify Gmail authorization and notification access independently; receive a supported
email and payment-app notification; review/add and dismiss drafts; reopen after process termination;
confirm a second alert with the same reference does not recreate a completed draft; revoke
each permission and confirm the source status reflects that change. Do not use a force stop
as a simulation of normal process termination: Android may block receivers until the app is reopened.

---

## 📦 Building with EAS (Expo Application Services)

The repository comes pre-configured with `eas.json` for Android and iOS builds:

### Android Standalone APK (Preview)
To generate an installable Android APK for testing:
```bash
npx eas-cli build --profile preview --platform android
```

### Production Build
To create production-ready app bundles:
```bash
npx eas-cli build --profile production --platform all
```

---

## 🔒 Privacy & Offline First

Pocket Ledger respects user privacy:
- **Local Ledger**: Entries, categories and debt ledgers remain on the device. Optional Gmail import connects directly to Google and requires internet access.
- **Local SQLite Engine**: Fast and responsive queries using synchronous SQLite execution.
- **No Analytics / Tracking**: Email parsing happens on the device; Pocket Ledger does not upload messages or ledger entries to an app backend. Google handles account authorization and Gmail API requests.

## Gmail setup (Android)

Email capture currently supports the supplied Slice UPI template from `noreply@slice.bank.in`
and HDFC RuPay credit-card UPI template from `alerts@hdfcbank.bank.in`. Other layouts, SBI,
attachments, statements, card repayments and card credits are deliberately unsupported until
tested fixtures are available. A sender address allowlist is not cryptographic proof of a
payment: all imported payments remain drafts for user review.

1. In your Google Cloud project, enable **Gmail API**. Configure Google Auth Platform branding,
   audience and data access for `https://www.googleapis.com/auth/gmail.readonly`.
2. For personal testing, add your Gmail address as a test user. Google may require renewed
   authorization for testing-mode apps. Public use requires applicable OAuth verification.
3. Create an **Android OAuth client** with package `com.navadeepdj.pocketledger` and the SHA-1
   of the signing certificate used by EAS. The installed release inspected in this workspace
   uses `0D:BC:AE:64:21:7C:D1:70:7C:52:6A:A5:8B:97:DA:DD:68:AE:AE:81`.
4. To test the separate local app, create another Android OAuth client in the same project for
   `com.navadeepdj.pocketledger.capturetest`, SHA-1
   `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
   Recheck fingerprints if signing keys change; these are public certificate fingerprints.
5. Build a fresh Android APK, open **Payment drafts → Connect Gmail**, review the disclosure,
   choose your account and grant Gmail read access. No client secret belongs in the mobile app.

The Android native sign-in SDK identifies the OAuth client by package/signing certificate.
There is no app backend, server refresh token, Firebase requirement, or web client ID in this
implementation. The dependency is Android-autolinked. Its Expo config plugin only needs
additional setup for Firebase/iOS; Gmail capture here is Android-only.

The initial sync starts at midnight India time on the day the user connects, including
already-read mail from the two supported sender addresses. **Change start date** lets the user
select an earlier date; that fixed preference persists across days and reconnects. Moving it
forward hides older pending email drafts without deleting them or changing ledger entries;
moving it back restores those drafts and imports additional matching messages. Both email
arrival time and the parsed transaction date respect the selected cutoff. Later syncs overlap
the last successful sync by two days, bounded by that cutoff; **Recheck date range** retries
unsupported messages after parser improvements. Pagination is fully consumed before
advancing the success timestamp. Sync runs on app resume (throttled) and every five minutes
while active, not continuously while the app is closed. This is not a push/background service.

Messages are parsed as text/HTML MIME parts without rendering HTML, loading tracking images,
opening links or downloading attachments. Only extracted transaction details are saved in
the backup-excluded drafts database. Tokens are obtained from the native Google SDK and are
not written to JS storage or logs. The app never sends/deletes mail or changes read status.
Google grants mailbox-wide read permission; the supported-bank filtering is application logic.

Draft writes and processed-email IDs commit together in SQLite. Message IDs are account-scoped
and retained to prevent repeated imports after a draft is dismissed or its raw text is cleared.
Disconnect stops future sync and attempts Google access revocation; existing drafts/ledger
entries and duplicate fingerprints remain. If offline revocation fails, remove access through
your Google Account's third-party connections page when connected.

Validation: `npm run typecheck` and `npm run test:services` (Node 22.13+ for the SQLite adapter).
Live acceptance requires the configured Google project and user consent: connect, sync both
sample formats, sync again (no duplicates), dismiss then resync, revoke Google access, reconnect,
cancel a sync, go offline and retry, and verify a different Gmail account cannot reuse the previous
account's checkpoint. No real-mail sync has been verified until these checks are performed.

References: [Gmail scope requirements](https://developers.google.com/workspace/gmail/api/auth/scopes),
[Google sign-in Android setup](https://react-native-google-signin.github.io/docs/setting-up/android),
[Gmail message listing](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list).

---

## 📄 License

This project is private and maintained for personal and community developer expense management.


## Ledger experience and spending insights

- Payment review shares the transaction editor, including category colours/icons, custom
  categories and contexts, event tags, a separate note and saved-person suggestions.
- Person suggestions use previously saved ledger/contact names locally; no phone contacts permission.
- Activity supports text search, paid/received filters and separate totals for the matching entries.
- Home and Reports show a selectable six-month spending trend and calendar-day average.
  Current-month comparisons use the same elapsed days in the prior month, capped at its
  length. Past months compare full-month totals. Zero baselines show no percentage.
  Receipts are excluded; incomplete current-month bars are labelled. These are recorded
  ledger statistics, not bank balances or proof of complete spending coverage.
- Connected Gmail settings collapse behind **Manage email capture**. Sync state and errors
  remain visible; changing the start date and disconnecting remain available there.

Before building, run `npm run typecheck` and `npm run test:services`. Install updates with
matching package/signing credentials to retain existing app data.
