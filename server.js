const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// --------- Helpers ----------
function generateId(len = 8) {
  const timestampPart = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2);
  return (timestampPart + randomPart).slice(0, len);
}
function pad(n) { return String(n).padStart(2, '0'); }
function todayLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${y}-${m}-${day}`;
}

const DB_FILE = path.join(__dirname, 'db.json');

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const db = { tables: [], bookings: [] };
    // Lower terrace only (26 total): pattern Big,Big,Small repeated in two rows
    const pattern = ['B','B','S','B','B','S','B','B','S','B','B','S','B'];
    let bigCounter = 0, smallCounter = 0;

    // Row 1
    pattern.forEach(type => {
      if (type === 'B') {
        bigCounter++;
        db.tables.push({ id: `L${bigCounter}`, capacity: 4, location: 'lower', row: 'row1', type: 'big', status: 'free', bookingId: null });
      } else {
        smallCounter++;
        db.tables.push({ id: `LS${smallCounter}`, capacity: 2, location: 'lower', row: 'row1', type: 'small', status: 'free', bookingId: null });
      }
    });
    // Row 2
    pattern.forEach(type => {
      if (type === 'B') {
        bigCounter++;
        db.tables.push({ id: `L${bigCounter}`, capacity: 4, location: 'lower', row: 'row2', type: 'big', status: 'free', bookingId: null });
      } else {
        smallCounter++;
        db.tables.push({ id: `LS${smallCounter}`, capacity: 2, location: 'lower', row: 'row2', type: 'small', status: 'free', bookingId: null });
      }
    });

    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    return db;
  }
  return JSON.parse(fs.readFileSync(DB_FILE));
}
function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function serveStatic(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.statusCode = 404; res.end('Not Found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' }[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.end(data);
  });
}

// --------- API handlers ----------
function handleGetTables(res, db) {
  const tables = db.tables.map(t => ({ ...t, booking: t.bookingId ? db.bookings.find(b => b.id === t.bookingId) : null }));
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(tables));
}
function handleGetBookings(res, db) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(db.bookings));
}
function validHHMM(s) { return /^([01]?\d|2[0-3]):[0-5]\d$/.test(s); }
function minutes(hhmm) { const [h,m] = hhmm.split(':').map(Number); return h*60+m; }

function handlePostBooking(req, res, db) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const { tables, people, name, startTime, endTime, date } = JSON.parse(body || '{}');
      if (!tables?.length) throw new Error('No tables selected');
      if (!people || people < 1 || people > 24) throw new Error('People must be 1–24');
      if (!name || !name.trim()) throw new Error('Name is required');
      if (!validHHMM(startTime) || !validHHMM(endTime)) throw new Error('Invalid time');
      const minAllowed = 11*60, maxAllowed = 22*60 + 30;
      const st = minutes(startTime), et = minutes(endTime);
      if (st < minAllowed || et > maxAllowed) throw new Error('Time must be 11:00–22:30');
      if (et <= st) throw new Error('End must be after start');

      // Ensure selected tables exist and are free
      const selected = tables.map(id => db.tables.find(t => t.id === id));
      if (selected.some(t => !t)) throw new Error('Invalid table id');
      if (selected.some(t => t.status === 'booked')) throw new Error('One or more tables already booked');

      const bookingId = generateId();
      const booking = {
        id: bookingId,
        date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayLocalISO(),
        tables,
        people,
        name: name.trim(),
        startTime,
        endTime
      };
      db.bookings.push(booking);
      selected.forEach(t => { t.status = 'booked'; t.bookingId = bookingId; });
      saveDB(db);

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(booking));
    } catch (e) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: e.message || 'Bad Request' }));
    }
  });
}

function handleDeleteBooking(res, db, id) {
  const idx = db.bookings.findIndex(b => b.id === id);
  if (idx === -1) { res.statusCode = 404; return res.end(JSON.stringify({ error: 'Not found' })); }
  const booking = db.bookings[idx];
  booking.tables.forEach(tid => {
    const t = db.tables.find(tt => tt.id === tid);
    if (t) { t.status = 'free'; t.bookingId = null; }
  });
  db.bookings.splice(idx, 1);
  saveDB(db);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ success: true }));
}

// --------- Server ----------
const server = http.createServer((req, res) => {
  const db = loadDB();
  const pathname = url.parse(req.url).pathname;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

  if (req.method === 'GET' && pathname === '/api/tables') return handleGetTables(res, db);
  if (req.method === 'GET' && pathname === '/api/bookings') return handleGetBookings(res, db);
  if (req.method === 'POST' && pathname === '/api/bookings') return handlePostBooking(req, res, db);
  if (req.method === 'DELETE' && pathname.startsWith('/api/bookings/')) return handleDeleteBooking(res, db, pathname.split('/').pop());

  const filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  serveStatic(filePath, res);
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));