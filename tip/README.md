# The Gratuity Dollar 💵

A tiny mobile-first web app for a real-life game: a group of friends passes around a single
dollar note ("the gratuity dollar") whenever someone does something nice (holds a door,
throws away rubbish, grabs the bill...). This app tracks **who currently holds the dollar**
and **how many times each person has held it**.

## How it works

- Everyone in the group opens the site and types the **same group code** + their name.
- The board shows the current holder in a spotlight, a leaderboard of holds, and a live feed.
- Tap **Pass the dollar** and pick whoever just earned it (optionally note the good deed).
- State is shared live across everyone's phones via Firebase Realtime Database.

## Tech

- Single static `index.html` — no build step.
- Firebase Realtime Database for shared realtime state (namespaced under `gratuity/<code>`).
- Deployed as a static site on Vercel (project: **tip**).

## Local preview

Just open `index.html` in a browser, or serve the folder:

```bash
npx serve tip
```
