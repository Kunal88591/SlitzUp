# SlitzUp

Divide bills, not friends.

SlitzUp is a browser-based group expense tracker for trip organizers. Only the organizer logs in with Google. Teammates are added as simple names, with no accounts, emails, or invites.

## Stack

- Node.js + Express
- HTML/CSS/Vanilla JavaScript
- Supabase (Google Auth + Postgres)

## Core Features

- Organizer-only authentication with Google Sign-In
- Create and switch between multiple groups
- Add members by name manually (for example Rahul, Priya)
- Add expense with split types:
  - Equal
  - Percentage (must total 100)
  - Exact (must total full amount)
- Balance lines in format: "Rahul owes Priya INR 200"
- Settle Up per debt row
- Green themed responsive UI for phone, tablet, and laptop

## Supabase Setup

1. Create a Supabase project.
2. Enable Google provider in Supabase Auth.
3. Add redirect URLs:
   - Site URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000`
4. Run SQL from [supabase/schema.sql](supabase/schema.sql) in Supabase SQL Editor.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Configure env file:

```bash
cp .env.example .env
```

3. Set values in `.env`:

```env
PORT=3000
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
```

4. Run app:

```bash
npm run dev
```

5. Open:

```text
http://localhost:3000
```

## Manual Test Scenario

1. Create group: `Weekend Trip`
2. Add members: `Alice`, `Bob`, `Charlie`
3. Add expense: `Pizza`, amount `1200`, paid by `Alice`, split `Equal`
4. Add expense: `Taxi`, amount `600`, paid by `Bob`, split `Percentage` with `50, 30, 20`
5. Verify balances look correct
6. Click Settle Up and verify debt disappears or reduces

## Notes

- The SQL schema resets earlier SlitzUp tables before creating the organizer-only structure.
- All balances are computed from expenses minus settlements.
