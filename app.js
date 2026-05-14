// ── State ──
const SLOTS = ['10:00', '12:00', '14:00', '16:00', '18:00'];
const MAX_SLOTS = 4;
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

let bookings = JSON.parse(localStorage.getItem('studio_bookings') || '{}');
let selectedDate = null;
let selectedSlot = null;
let curYear, curMonth;

const now = new Date();
curYear = now.getFullYear();
curMonth = now.getMonth();

// ── Helpers ──
function dateKey(y, m, d) { return `${y}-${m+1}-${d}`; }
function getDayBookings(key) { return bookings[key] || []; }
function getTakenSlots(key) { return getDayBookings(key).map(b => b.slot); }
function save() { localStorage.setItem('studio_bookings', JSON.stringify(bookings)); }

// ── Render Calendar ──
function renderCal() {
  document.getElementById('calMonth').textContent = MONTHS[curMonth];
  document.getElementById('calYear').textContent = curYear;

  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';

  const first = new Date(curYear, curMonth, 1);
  let startDow = first.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
  const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate());

  for (let i = 0; i < startDow; i++) {
    const el = document.createElement('div');
    el.className = 'cal-cell empty';
    grid.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const key = dateKey(curYear, curMonth, d);
    const taken = getTakenSlots(key).length;
    const cell = document.createElement('div');

    let cls = 'cal-cell';
    if (key === todayKey) cls += ' today';
    if (key === selectedDate) cls += ' selected';
    cell.className = cls;

    let dotHtml = '';
    if (taken === 0) dotHtml = '';
    else if (taken < MAX_SLOTS) dotHtml = `<div class="cell-dots"><div class="cell-dot p"></div></div>`;
    else dotHtml = `<div class="cell-dots"><div class="cell-dot r"></div></div>`;

    if (Object.keys(bookings).some(k => k === key) && taken === 0) dotHtml = '';
    if (taken === 0 && getDayBookings(key).length === 0) {
      // no dot needed
    } else if (taken > 0 && taken < MAX_SLOTS) {
      dotHtml = `<div class="cell-dots"><div class="cell-dot p"></div></div>`;
    } else if (taken >= MAX_SLOTS) {
      dotHtml = `<div class="cell-dots"><div class="cell-dot r"></div></div>`;
    }

    cell.innerHTML = `<span class="cell-num">${d}</span>${dotHtml}`;
    cell.onclick = () => openDay(key, d);
    grid.appendChild(cell);
  }
}

// ── Open Day ──
function openDay(key, d) {
  selectedDate = key;
  selectedSlot = null;
  renderCal();

  document.getElementById('dayEmpty').style.display = 'none';
  const content = document.getElementById('dayContent');
  content.style.display = 'block';

  const dayOfWeek = new Date(curYear, curMonth, d).toLocaleDateString('en-US', { weekday: 'long' });
  document.getElementById('dayLabel').textContent = `${dayOfWeek}, ${MONTHS[curMonth]} ${d}`;

  document.getElementById('formWrap').style.display = 'none';
  renderDaySlots();
  renderDayBookings();
  renderUpcoming();
}

function closeDay() {
  selectedDate = null;
  selectedSlot = null;
  renderCal();
  document.getElementById('dayEmpty').style.display = 'flex';
  document.getElementById('dayContent').style.display = 'none';
  document.getElementById('formWrap').style.display = 'none';
}

// ── Render Slots ──
function renderDaySlots() {
  if (!selectedDate) return;
  const taken = getTakenSlots(selectedDate);
  const free = MAX_SLOTS - taken.length;
  document.getElementById('daySlotsSummary').textContent = `${free} of ${MAX_SLOTS} slots available`;

  const wrap = document.getElementById('slotsWrap');
  wrap.innerHTML = '';
  SLOTS.forEach(s => {
    const isTaken = taken.includes(s);
    const isSel = selectedSlot === s;
    const chip = document.createElement('div');
    chip.className = 'slot-chip ' + (isTaken ? 'taken' : isSel ? 'selected' : 'free');
    chip.textContent = s + (isTaken ? ' ✓' : '');
    if (!isTaken) chip.onclick = () => selectSlot(s);
    wrap.appendChild(chip);
  });
}

// ── Select Slot ──
function selectSlot(slot) {
  const taken = getTakenSlots(selectedDate);
  if (taken.length >= MAX_SLOTS) return;
  selectedSlot = slot;
  renderDaySlots();
  const form = document.getElementById('formWrap');
  form.style.display = 'block';
  document.getElementById('formSlot').textContent = slot;
  ['fName','fContact','fStyle','fNotes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('fType').value = '';
  form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Render Bookings ──
function renderDayBookings() {
  if (!selectedDate) return;
  const list = getDayBookings(selectedDate);
  const wrap = document.getElementById('bookingsWrap');
  if (list.length === 0) {
    wrap.innerHTML = '<p class="no-bookings">No bookings for this day yet</p>';
    return;
  }
  wrap.innerHTML = list.map((b, i) => `
    <div class="booking-card">
      <span class="b-time">${b.slot}</span>
      <div class="b-info">
        <div class="b-name">${b.name}</div>
        <div class="b-type">${[b.type, b.style].filter(Boolean).join(' · ') || '—'}</div>
        ${b.contact ? `<div class="b-contact">${b.contact}</div>` : ''}
      </div>
      <button class="b-del" onclick="deleteBooking(${i})" title="Remove">✕</button>
    </div>
  `).join('');
}

// ── Save Booking ──
function saveBooking() {
  const name = document.getElementById('fName').value.trim();
  if (!name) { document.getElementById('fName').focus(); return; }
  if (!selectedDate || !selectedSlot) return;

  if (!bookings[selectedDate]) bookings[selectedDate] = [];
  bookings[selectedDate].push({
    slot: selectedSlot,
    name,
    contact: document.getElementById('fContact').value.trim(),
    type: document.getElementById('fType').value,
    style: document.getElementById('fStyle').value.trim(),
    notes: document.getElementById('fNotes').value.trim()
  });
  bookings[selectedDate].sort((a, b) => a.slot.localeCompare(b.slot));
  save();

  selectedSlot = null;
  document.getElementById('formWrap').style.display = 'none';
  renderDaySlots();
  renderDayBookings();
  renderCal();
  renderUpcoming();
}

// ── Delete Booking ──
function deleteBooking(idx) {
  if (!confirm('Remove this booking?')) return;
  bookings[selectedDate].splice(idx, 1);
  if (bookings[selectedDate].length === 0) delete bookings[selectedDate];
  save();
  renderDaySlots();
  renderDayBookings();
  renderCal();
  renderUpcoming();
}

// ── Upcoming Panel ──
function renderUpcoming() {
  const allBookings = [];
  const today = new Date(); today.setHours(0,0,0,0);

  Object.entries(bookings).forEach(([key, list]) => {
    const [y,m,d] = key.split('-').map(Number);
    const date = new Date(y, m-1, d);
    if (date >= today) {
      list.forEach(b => allBookings.push({ key, date, d, m, y, ...b }));
    }
  });

  allBookings.sort((a, b) => {
    if (a.date - b.date !== 0) return a.date - b.date;
    return a.slot.localeCompare(b.slot);
  });

  document.getElementById('upcomingCount').textContent = allBookings.length;
  const ul = document.getElementById('upcomingList');

  if (allBookings.length === 0) {
    ul.innerHTML = '<p class="no-upcoming">No upcoming bookings</p>';
    return;
  }

  ul.innerHTML = allBookings.slice(0, 20).map(b => {
    const dateStr = `${MONTHS[b.m-1].slice(0,3).toUpperCase()} ${b.d}`;
    return `<div class="up-card" onclick="jumpToDate('${b.key}',${b.d},${b.m-1},${b.y})">
      <div class="up-date">${dateStr}</div>
      <div class="up-name">${b.name}</div>
      ${b.type ? `<div class="up-type">${b.type}</div>` : ''}
      <div class="up-slot">${b.slot}</div>
    </div>`;
  }).join('');
}

function jumpToDate(key, d, m, y) {
  curMonth = m;
  curYear = y;
  renderCal();
  openDay(key, d);
}

// ── Month Navigation ──
document.getElementById('prevBtn').onclick = () => {
  curMonth--;
  if (curMonth < 0) { curMonth = 11; curYear--; }
  selectedDate = null;
  closeDay();
  renderCal();
};

document.getElementById('nextBtn').onclick = () => {
  curMonth++;
  if (curMonth > 11) { curMonth = 0; curYear++; }
  selectedDate = null;
  closeDay();
  renderCal();
};

document.getElementById('closeBtn').onclick = closeDay;
document.getElementById('cancelBtn').onclick = () => {
  document.getElementById('formWrap').style.display = 'none';
  selectedSlot = null;
  renderDaySlots();
};
document.getElementById('saveBtn').onclick = saveBooking;

// ── Init ──
renderCal();
renderUpcoming();
