// --- State ---
let tables = [];
let selectedTables = [];
let allBookings = [];
let currentPopupBookingId = null;

// Pattern order for lower terrace to match image
const lowerRow1Order = ['L1','L2','LS1','L3','L4','LS2','L5','L6','LS3','L7','L8','LS4','L9'];
const lowerRow2Order = ['L10','L11','LS5','L12','L13','LS6','L14','L15','LS7','L16','L17','LS8','L18'];

// --- Time helpers ---
function nowHHMM() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2,'0');
  const m = String(d.getMinutes()).padStart(2,'0');
  return `${h}:${m}`;
}
function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}
function minutes(hhmm){ const [h,m] = hhmm.split(':').map(Number); return h*60+m; }

// --- Live clock in header ---
function tickClock() {
  const d = new Date();
  const dateStr = d.toLocaleDateString(undefined, { weekday:'short', year:'numeric', month:'short', day:'numeric' });
  const timeStr = d.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  document.getElementById('todayText').textContent = dateStr;
  document.getElementById('timeText').textContent  = timeStr;
}
setInterval(tickClock, 1000); tickClock();

// --- Load data ---
async function fetchTables() {
  const res = await fetch('/api/tables'); return res.json();
}
async function fetchBookings() {
  const res = await fetch('/api/bookings'); return res.json();
}

// Auto-free expired (client-side)
async function autoFreeExpired() {
  const current = nowHHMM();
  const todays = allBookings.filter(b => b.date === todayISO());
  const expired = todays.filter(b => minutes(b.endTime) <= minutes(current));
  for (const b of expired) {
    await fetch('/api/bookings/' + b.id, { method: 'DELETE' });
  }
}

// --- Render ---
function renderLowerRows() {
  const r1 = document.getElementById('lower-row1'); r1.innerHTML = '';
  const r2 = document.getElementById('lower-row2'); r2.innerHTML = '';

  function createBox(table){
    const div = document.createElement('div');
    div.className = `table ${table.type} ${table.location} ${table.status}`;
    // label
    const tid = document.createElement('div'); tid.className = 'tid'; tid.textContent = table.id; div.appendChild(tid);

    if (table.booking) {
      const nm = document.createElement('div'); nm.className = 'tname'; nm.textContent = table.booking.name; div.appendChild(nm);
      const tm = document.createElement('div'); tm.className = 'ttime'; tm.textContent = `${table.booking.startTime}–${table.booking.endTime}`; div.appendChild(tm);
      div.onclick = () => openPopup(table.booking);
    } else {
      if (selectedTables.includes(table.id)) div.classList.add('selected');
      div.onclick = () => toggleSelect(table.id);
    }
    return div;
  }

  lowerRow1Order.forEach(id => {
    const t = tables.find(tt => tt.id === id);
    if (t) r1.appendChild(createBox(t));
  });
  lowerRow2Order.forEach(id => {
    const t = tables.find(tt => tt.id === id);
    if (t) r2.appendChild(createBox(t));
  });
}

function renderReservationsSheet() {
  const list = document.getElementById('reservationsList');
  list.innerHTML = '';
  const todays = allBookings
    .filter(b => b.date === todayISO())
    .sort((a,b) => minutes(a.startTime)-minutes(b.startTime));

  if (todays.length === 0) {
    list.innerHTML = '<p style="color:#666">No reservations today.</p>';
    return;
  }
  todays.forEach(b => {
    const div = document.createElement('div'); div.className = 'res-item';
    const title = document.createElement('div'); title.className = 'res-title'; title.textContent = `${b.name} (${b.people}) — ${b.startTime}–${b.endTime}`;
    const meta = document.createElement('div'); meta.className = 'res-meta'; meta.textContent = `Tables: ${b.tables.join(', ')}`;
    div.appendChild(title); div.appendChild(meta);
    list.appendChild(div);
  });
}

// --- UI actions ---
function toggleSelect(id) {
  if (selectedTables.includes(id)) selectedTables = selectedTables.filter(x => x !== id);
  else selectedTables.push(id);
  document.getElementById('bookingControls').classList.remove('hidden');
  renderLowerRows();
}

document.getElementById('startBookingBtn').onclick = () => {
  selectedTables = [];
  document.getElementById('bookingControls').classList.remove('hidden');
};

document.getElementById('cancelSelectionBtn').onclick = () => {
  selectedTables = [];
  document.getElementById('bookingControls').classList.add('hidden');
  renderLowerRows();
};

document.getElementById('confirmSelectionBtn').onclick = () => {
  // people dropdown
  const sel = document.getElementById('bookingPeople');
  sel.innerHTML = ''; for (let i=1;i<=24;i++){ const o=document.createElement('option'); o.value=i; o.textContent=i; sel.appendChild(o); }
  document.getElementById('selectedTablesDisplay').textContent = selectedTables.join(', ');
  document.getElementById('bookingPanel').classList.remove('hidden');
};

document.getElementById('formCancelBtn').onclick = () => {
  document.getElementById('bookingPanel').classList.add('hidden');
  document.getElementById('bookingControls').classList.add('hidden');
  selectedTables = [];
  renderLowerRows();
};

// Submit booking
document.getElementById('bookingForm').onsubmit = async (e) => {
  e.preventDefault();
  const payload = {
    tables: selectedTables,
    people: parseInt(document.getElementById('bookingPeople').value,10),
    name: document.getElementById('bookingName').value.trim(),
    startTime: document.getElementById('bookingStart').value,
    endTime: document.getElementById('bookingEnd').value,
    date: todayISO()
  };
  const res = await fetch('/api/bookings', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  if (!res.ok) {
    const { error } = await res.json();
    alert(error || 'Failed to create booking'); return;
  }
  document.getElementById('bookingPanel').classList.add('hidden');
  document.getElementById('bookingControls').classList.add('hidden');
  selectedTables = [];
  await reloadAll();
};

// Popup for booked table
function openPopup(booking){
  currentPopupBookingId = booking.id;
  document.getElementById('popupTitle').textContent = `Reservation ${booking.tables.join(', ')}`;
  document.getElementById('popupName').textContent = booking.name;
  document.getElementById('popupPeople').textContent = booking.people;
  document.getElementById('popupTime').textContent = `${booking.startTime}–${booking.endTime}`;
  document.getElementById('tablePopup').classList.remove('hidden');
}
document.getElementById('popupClose').onclick = () => {
  document.getElementById('tablePopup').classList.add('hidden');
};
document.getElementById('popupCancelBooking').onclick = async () => {
  if (!currentPopupBookingId) return;
  if (!confirm('Are you sure you want to cancel this reservation?')) return;
  await fetch('/api/bookings/' + currentPopupBookingId, { method:'DELETE' });
  document.getElementById('tablePopup').classList.add('hidden');
  currentPopupBookingId = null;
  await reloadAll();
};

// Reservations sheet
document.getElementById('reservationsBtn').onclick = () => {
  renderReservationsSheet();
  document.getElementById('reservationsSheet').classList.remove('hidden');
};
document.getElementById('closeSheetBtn').onclick = () => {
  document.getElementById('reservationsSheet').classList.add('hidden');
};

// --- Reload everything ---
async function reloadAll(){
  allBookings = await fetchBookings();
  await autoFreeExpired();
  tables = await fetchTables();
  renderLowerRows();
}
reloadAll();
setInterval(reloadAll, 60000); // refresh every minute