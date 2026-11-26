/* =========================================================
   FamPaw Care – Dashboard behaviour
   Right now the information below is SAMPLE DATA.
   Later, the database will give us the real data instead.
   ========================================================= */

/* ---------- 1. DATA (the same data every other page uses, from js/store.js) ---------- */
const db = FP.load();
const user = FP.session() || { name: "Guest", first: "Guest", family: "" };

const familyMembers = db.family;
const pets = db.pets;

const TODAY = FP.todayISO();
const people = FP.owners(db);

// Upcoming appointments: status "Upcoming" only, soonest first (family + pets together)
const appointments = db.appointments.family.map(a => ({ ...a, type: "family" }))
  .concat(db.appointments.pet.map(a => ({ ...a, type: "pet" })))
  .filter(a => a.status === "Upcoming")
  .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  .map(a => ({ title: a.title, who: FP.ownerName(db, a.type, a.ownerId), type: a.type,
               date: a.date, time: FP.formatTime(a.time), place: a.place }));

// Recent health records: newest first, top 3
const RECORD_ICONS = { "General Check-up": "🩺", "Veterinary Visit": "🩺", "Illness": "🤒", "Allergy": "🤧",
                       "Medication": "💊", "Vaccination": "💉", "Other": "📝" };
const healthRecords = db.records.family.map(r => ({ r, section: "family" }))
  .concat(db.records.pet.map(r => ({ r, section: "pet" })))
  .sort((a, b) => b.r.date.localeCompare(a.r.date) || b.r.id - a.r.id)
  .slice(0, 3)
  .map(x => ({ title: x.r.title, who: FP.ownerName(db, x.section, x.r.ownerId), type: x.section,
               date: x.r.date, icon: RECORD_ICONS[x.r.type] || "📝", kind: x.r.type }));

// Reminders: not finished first (soonest due first), then finished ones; show 5
const allReminders = db.reminders.slice();
const reminders = allReminders
  .sort((a, b) => (a.done - b.done) || a.due.localeCompare(b.due))
  .slice(0, 5)
  .map(r => ({ id: r.id, title: r.title, who: FP.ownerName(db, r.section, r.ownerId), due: FP.dueText(r.due), done: r.done }));

/* ---------- 2. SMALL HELPER FUNCTIONS ---------- */
const $ = id => document.getElementById(id);
const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

// Makes text safe before putting it on the page
function esc(text) {
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
}
function tag(type) {
  return type === "pet" ? '<span class="tag pet">Pet</span>' : '<span class="tag family">Family</span>';
}
function monthDay(iso) {            // "2026-11-20" -> { m: "NOV", d: "20" }
  const p = iso.split("-");
  return { m: MONTHS[Number(p[1]) - 1], d: p[2] };
}
function showEmpty(listId, emptyId, isEmpty) {
  $(listId).hidden = isEmpty;
  $(emptyId).hidden = !isEmpty;
}

/* ---------- 3. WELCOME MESSAGE ---------- */
const firstName = user.name.split(" ")[0];
$("hello").textContent = "Welcome back, " + firstName + " 👋";
$("subtitle").textContent = (user.family ? user.family + " · " : "") + "Here is what is happening today.";
$("userName").textContent = user.name;
$("avatar").textContent = firstName.charAt(0);

/* ---------- 4. APPOINTMENTS ---------- */
function showAppointments() {
  $("apptList").innerHTML = appointments.map(a => {
    const dt = monthDay(a.date);
    return `<li>
      <div class="date">${dt.m}<b>${dt.d}</b></div>
      <div class="info"><strong>${esc(a.title)}</strong><small>${esc(a.who)} · ${esc(a.place)} · ${esc(a.time)}</small></div>
      ${tag(a.type)}
    </li>`;
  }).join("");
  showEmpty("apptList", "apptEmpty", appointments.length === 0);
}

/* ---------- 5. HEALTH RECORDS ---------- */
function showRecords() {
  $("recList").innerHTML = healthRecords.map(r => {
    const dt = monthDay(r.date);
    return `<li>
      <div class="rec-icon" aria-hidden="true">${r.icon}</div>
      <div class="info"><strong>${esc(r.title)}</strong><small>${esc(r.who)} · ${esc(r.kind)} · ${dt.m} ${dt.d}</small></div>
      ${tag(r.type)}
    </li>`;
  }).join("");
  showEmpty("recList", "recEmpty", healthRecords.length === 0);
}

/* ---------- 6. REMINDERS (tick = done) ---------- */
function showReminders() {
  $("remList").innerHTML = reminders.map(r => `<li class="rem ${r.done ? "done" : ""}">
      <input type="checkbox" id="rem${r.id}" data-id="${r.id}" ${r.done ? "checked" : ""}>
      <label for="rem${r.id}" class="info"><strong>${esc(r.title)}</strong><small>${esc(r.who)} · ${esc(r.due)}</small></label>
    </li>`).join("");
  showEmpty("remList", "remEmpty", reminders.length === 0);
}
$("remList").addEventListener("change", e => {
  const id = Number(e.target.dataset.id);
  const r = reminders.find(x => x.id === id), real = db.reminders.find(x => x.id === id);
  if (r && real) { r.done = real.done = e.target.checked; FP.save(db); showReminders(); showNumbers(); }
});

/* ---------- 7. SUMMARY NUMBERS ---------- */
function showNumbers() {
  $("statFamily").textContent = familyMembers.length;
  $("statPets").textContent = pets.length;
  $("statAppts").textContent = appointments.length;     // every Upcoming appointment
  $("statRem").textContent = db.reminders.filter(r => !r.done).length;
}

showNumbers(); showAppointments(); showRecords(); showReminders();

/* The mobile menu, Log out and the top bar name are handled by js/app.js */
