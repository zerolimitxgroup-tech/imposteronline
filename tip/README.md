# The Gratuity Dollar 💵

A tiny mobile-first web app for a real-life game: a group of friends passes around a single
dollar note ("the gratuity dollar") whenever someone does something nice (holds a door,
throws away rubbish, grabs the bill...). This app tracks **who currently holds the dollar**
and **how many times each person has held it**.

## How it works

- Everyone in the group opens the site and types the **same group code** + their name.
- The board shows the current holder in a spotlight, a leaderboard of holds, and a live feed.
- Tap **Pass the dollar** and pick whoever just earned it (optionally note the good deed).
- State is shared across everyone's phones and refreshes every ~3 seconds.

## Architecture

- **Frontend:** a single static `index.html` (no build step). Talks to a same-origin API and
  polls it every few seconds for live updates.
- **Backend:** one Vercel serverless function, `api/state.js`, handling `GET`/`POST` for the
  group state (join, pass, undo, add/remove people, reset).
- **Storage:** all groups live in a single anonymous [JSONBlob](https://jsonblob.com) document
  (no account, no keys). The blob URL lives in `api/state.js`. It was created once via a
  throwaway `api/init.js` bootstrap (removed after use). The blob URL is not a secret.

Because the browser only talks to the same-origin `/api/state`, there are no CORS or API-key
concerns, and no third-party client SDKs are loaded.

### Caveats

- Sync is by polling (~3s), not instant push.
- Writes are last-writer-wins on the whole document — if two people pass the dollar in the
  exact same moment, one update can be overwritten. Fine for a small friend group.
- A JSONBlob can be garbage-collected after ~30 days of inactivity. To move to a permanent
  store later, swap `readDB`/`writeDB` in `api/state.js` for Vercel KV / Firebase / Supabase.

## Deploy

Deployed as the Vercel project **tip** (production alias `tip-steel.vercel.app`). The `/api`
folder is auto-detected as a serverless function; `index.html` is served statically.

## Local preview

Static preview only (the API needs Vercel to run):

```bash
npx serve tip
```
