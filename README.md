# Purdue Triathlon Club - Swim Tracker 🏊‍♂️

A minimalist, classic collegiate web application for tracking swim workouts and leaderboards for the **Purdue Triathlon Club**, powered by the **Strava API**.

## Features

- **Classic Athletic Podium & Leaderboard**:
  - **Top 3 on Podium**: Visual 3-tier winner's podium with the **Purdue Triathlon Club Logo** on the center step.
  - **The Rest in a List**: Clean, classic roster list for ranks #4 and beyond.
  - **Sorted by Swims / Week**: Default view is sorted by swim sessions per week, with an instant toggle for **Yards / Week**.
  - **Since Last Week**: Week-over-week trends showing changes in swims and yards.
  - **Swimmer Stats Modal**: Click on any swimmer (on the podium or list) to view their full stats breakdown and recent swim logs (yards, duration, pace per 100 yd).
- **Strava Integration**:
  - One-click **Connect Strava** button via OAuth 2.0.
  - Automatic filtering for swim activities (`type: "Swim"`).
  - Converts meters to Short-Course Yards (SCY).
  - Out-of-the-box demo mode with realistic Purdue Tri swimmers so you can test immediately without credentials.

---

## Getting Started

### 1. Install Dependencies & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 2. Connect Your Live Strava Account

To connect your live Strava account:

1. Create a free developer application at [https://www.strava.com/settings/api](https://www.strava.com/settings/api).
2. Set **Authorization Callback Domain** to `localhost:3000`.
3. Create a `.env.local` file in the root directory:

```env
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
```

4. Restart `npm run dev`. Click **Connect Strava** and authorize with your account!
