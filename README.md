# Purdue Triathlon Club - Swim Tracker 🏊‍♂️

A classic, minimalist collegiate web application for tracking swim workouts and leaderboards for the **Purdue Triathlon Club**, powered by Next.js and the **Strava API**.

---

## 🏆 Key Features

- **Classic Athletic Podium & Leaderboard**:
  - **Top 3 Podium**: Visual 3-tier winner's podium with the **Purdue Triathlon Club** logo on the center step.
  - **Roster Standings**: Clean roster list for ranks #4 and beyond with collegiate styling.
  - **Weekly Leaderboard**: Tracks active weekly swims and yards with day-in-week elapsed pace delta comparisons (`±0`).
  - **Swim Challenge Leaderboard**: Tracks official challenge standings across completed weeks (Monday–Sunday) for the 2026/27 season.
  - **Archive Modal**: View previous completed weeks with a smooth week dropdown selector and community club totals.
- **Athlete Profile Modal**:
  - Click on any swimmer to view their profile, overall pace per 100 yards, and recent swim activities with direct links to Strava.
  - **Career Medals**: Automatically calculates and awards career Gold (🥇), Silver (🥈), and Bronze (🥉) finishes across completed challenge weeks—only displayed when medals have been earned.
- **Strava OAuth 2.0 & Automatic Tracking**:
  - Connect with Strava in one click.
  - Converts meters to Short-Course Yards (SCY).
  - Background tracking keeps your standing updated even when logged out.
- **Self-Service Settings & Sync**:
  - Re-sync and refresh button: *"had to update/delete swim? click here to refresh your data"* reconciles edited or deleted swims.
  - Full account deletion and privacy controls.
- **Serverless-Ready Database**:
  - Powered by **LibSQL / Turso Cloud SQLite** (`@libsql/client`), enabling zero-maintenance serverless deployment on Vercel while falling back to local SQLite in development.

---

## 🚀 Getting Started (Local Development)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Strava Developer Application (https://www.strava.com/settings/api)
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Turso Cloud SQLite (omit in dev to use local data/swimtracker.db)
# TURSO_DATABASE_URL=libsql://your-db-org.turso.io
# TURSO_AUTH_TOKEN=your_turso_token
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploying to Vercel

### Step 1: Create a Free Turso Database
1. Sign up for free at [turso.tech](https://turso.tech) using GitHub.
2. Click **Create Database** (e.g. `purdue-swim-tracker`).
3. Copy your:
   - **Database URL** (`libsql://...`)
   - **Auth Token** (Generate under your database tokens)

### Step 2: Deploy to Vercel
1. Push your repository to GitHub.
2. Go to [vercel.com](https://vercel.com) $\rightarrow$ **Add New Project** $\rightarrow$ Import this repository.
3. In **Environment Variables**, add:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
   - `NEXT_PUBLIC_APP_URL` (set to your Vercel URL, e.g. `https://your-project.vercel.app`)
4. Click **Deploy**.

### Step 3: Update Strava Developer Settings
To allow club members to log in from your live site:
1. Go to [strava.com/settings/api](https://www.strava.com/settings/api).
2. Set **Authorization Callback Domain** to your Vercel domain (e.g. `your-project.vercel.app` — *without* `https://`).
3. Save changes.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Database**: LibSQL / Turso (`@libsql/client`)
- **API**: Strava REST API v3 & Webhooks

---

## 🏊‍♂️ Boiler Up, Hammer Down!
Built with Purdue Old Gold (`#cfb991`) & Black pride for the Purdue Triathlon Club.
