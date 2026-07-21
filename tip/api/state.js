// Backend for The Gratuity Dollar.
// All groups live in one anonymous JSONBlob (created once via /api/init).
// The browser calls this same-origin endpoint, so there are no CORS or key issues.
//   GET  /api/state?g=<code>            -> returns that group's current state
//   POST /api/state  { g, op, ... }     -> mutates and returns the group
// Each mutation is a read-modify-write of the blob (last-writer-wins; fine for a
// small friend group). No secrets involved — the blob URL is not sensitive.

const BLOB = 'https://jsonblob.com/api/jsonBlob/019f84ad-6a5b-7cdc-94ae-f8a8bd027e23';

async function readDB() {
  const r = await fetch(BLOB, { headers: { 'Accept': 'application/json' } });
  if (!r.ok) throw new Error('read ' + r.status);
  const d = await r.json();
  if (!d.groups) d.groups = {};
  return d;
}
async function writeDB(db) {
  const r = await fetch(BLOB, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(db)
  });
  if (!r.ok) throw new Error('write ' + r.status);
}

function uid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function blankGroup(code) { return { name: code, createdAt: Date.now(), holder: null, players: {}, log: {} }; }
function ensure(db, code) { if (!db.groups[code]) db.groups[code] = blankGroup(code); return db.groups[code]; }

function readBody(req) {
  return new Promise((resolve) => {
    if (req.body !== undefined && req.body !== null) {
      if (typeof req.body === 'string') { try { return resolve(JSON.parse(req.body || '{}')); } catch (e) { return resolve({}); } }
      return resolve(req.body);
    }
    let d = '';
    req.on('data', c => d += c);
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const code = (req.query && req.query.g || '').toString();
      if (!code) return res.status(400).json({ error: 'missing group code' });
      const db = await readDB();
      return res.status(200).json(db.groups[code] || blankGroup(code));
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const op = body.op;
      const code = (body.g || '').toString();
      if (!code) return res.status(400).json({ error: 'missing group code' });

      const db = await readDB();
      const g = ensure(db, code);

      if (op === 'join') {
        const name = (body.name || '').toString().trim();
        if (!name) return res.status(400).json({ error: 'missing name' });
        let myId = null;
        for (const id in g.players) { if (g.players[id].name.toLowerCase() === name.toLowerCase()) { myId = id; break; } }
        if (!myId) { myId = uid(); g.players[myId] = { name, count: 0, joinedAt: Date.now() }; }
        await writeDB(db);
        return res.status(200).json({ group: g, myId });
      }

      if (op === 'pass') {
        const toId = body.toId;
        const to = g.players[toId];
        if (!to) return res.status(400).json({ error: 'unknown player' });
        const fromId = g.holder;
        const from = fromId && g.players[fromId] ? g.players[fromId] : null;
        g.holder = toId;
        to.count = (to.count || 0) + 1;
        const logId = uid();
        if (!g.log) g.log = {};
        g.log[logId] = {
          toId, toName: to.name,
          fromId: fromId || null, fromName: from ? from.name : null,
          reason: (body.reason || '').toString().trim() || null,
          at: Date.now()
        };
        await writeDB(db);
        return res.status(200).json(g);
      }

      if (op === 'undo') {
        const log = g.log || {};
        const entries = Object.keys(log).map(k => ({ k, ...log[k] })).sort((a, b) => b.at - a.at);
        const last = entries[0];
        if (last) {
          delete g.log[last.k];
          const p = g.players[last.toId];
          if (p) p.count = Math.max(0, (p.count || 0) - 1);
          g.holder = last.fromId || null;
          await writeDB(db);
        }
        return res.status(200).json(g);
      }

      if (op === 'add') {
        const name = (body.name || '').toString().trim();
        if (!name) return res.status(400).json({ error: 'missing name' });
        const exists = Object.keys(g.players).some(id => g.players[id].name.toLowerCase() === name.toLowerCase());
        if (!exists) { g.players[uid()] = { name, count: 0, joinedAt: Date.now() }; await writeDB(db); }
        return res.status(200).json(g);
      }

      if (op === 'remove') {
        const id = body.id;
        if (g.players[id]) { delete g.players[id]; if (g.holder === id) g.holder = null; await writeDB(db); }
        return res.status(200).json(g);
      }

      if (op === 'reset') {
        g.holder = null; g.log = {};
        for (const id in g.players) g.players[id].count = 0;
        await writeDB(db);
        return res.status(200).json(g);
      }

      return res.status(400).json({ error: 'unknown op' });
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    res.status(502).json({ error: 'backend', detail: String(e) });
  }
};
