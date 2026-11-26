/* =========================================================
   FamPaw Care – Appointments page
   Two categories: Family Appointments and Pet Appointments.
   All the appointments below are SAMPLE DATA (fictional).
   They live only in this page's memory: refresh = back to the start.
   Later, the database will save the real data.
   ========================================================= */

/* ---------- 1. SAMPLE DATA ---------- */

// The family members and pets (the real ones, shared with every page through js/store.js)
const db = FP.load();
const people = FP.owners(db);
const familyMembers = people.family;
const pets = people.pet;
const owners = people;   // keeps the two categories apart

const TYPES = {
  family: ["General Check-up", "Dental Appointment", "Eye Check-up", "Specialist Consultation", "Other"],
  pet:    ["Veterinary Check-up", "Vaccination Appointment", "Grooming Appointment", "Follow-up Visit", "Other"]
};
const TYPE_ICONS = { "General Check-up": "🩺", "Dental Appointment": "🦷", "Eye Check-up": "👁️", "Specialist Consultation": "🧑‍⚕️",
  "Veterinary Check-up": "🩺", "Vaccination Appointment": "💉", "Grooming Appointment": "✂️", "Follow-up Visit": "🔁", "Other": "📅" };

// Every appointment has an ownerId: the id of ONE family member or ONE pet.
// date = "year-month-day", time = "hour:minute" (24 hours). status is chosen by the user.
const data = db.appointments;

// What is on the screen right now
let section = "family";                          // "family" or "pet"
const selected = { family: "all", pet: "all" };  // "all" or one person's / pet's id
let editing = { section: null, id: null };       // id null = adding
let deleting = { section: null, id: null };

/* ---------- 2. SMALL HELPERS ---------- */
const $ = id => document.getElementById(id);
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function esc(text) {                       // makes text safe before showing it
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
}
function formatDate(iso) {                 // "2026-12-04" -> "4 Dec 2026"
  const p = iso.split("-");
  return Number(p[2]) + " " + MONTHS[Number(p[1]) - 1] + " " + p[0];
}
function formatTime(t) {                   // "14:30" -> "2:30 PM"
  const h = Number(t.slice(0, 2));
  return (h % 12 || 12) + ":" + t.slice(3, 5) + " " + (h >= 12 ? "PM" : "AM");
}
function ownerOf(sec, ownerId) { return owners[sec].find(o => o.id === ownerId); }
function word(n) { return n === 1 ? "1 appointment" : n + " appointments"; }
function countFor(sec, ownerId) { return data[sec].filter(a => ownerId === "all" || a.ownerId === ownerId).length; }
function countStatus(status) {             // across family + pets
  return data.family.concat(data.pet).filter(a => a.status === status).length;
}

/* ---------- 3. SHOW THE PAGE ---------- */

// The 6 summary cards (family + pets together)
function showSummary() {
  $("sTotal").textContent = data.family.length + data.pet.length;
  $("sUpcoming").textContent = countStatus("Upcoming");
  $("sCompleted").textContent = countStatus("Completed");
  $("sCancelled").textContent = countStatus("Cancelled");
  $("sFamily").textContent = data.family.length;
  $("sPet").textContent = data.pet.length;
}

function showTabs() {
  ["family", "pet"].forEach(sec => {
    $(sec === "family" ? "tabFamily" : "tabPet").setAttribute("aria-selected", sec === section);
    $(sec === "family" ? "numFamily" : "numPet").textContent = data[sec].length;
  });
}

// Profile buttons: "View All ..." + one for each person / pet
function showChoices() {
  const isFamily = section === "family";
  let html = `<button type="button" class="choice all" data-owner="all" aria-pressed="${selected[section] === "all"}">
      <span class="c-pic" aria-hidden="true">${isFamily ? "👨‍👩‍👧" : "🐾"}</span>
      <span><b>${isFamily ? "View All Family Appointments" : "View All Pet Appointments"}</b><small>${word(countFor(section, "all"))}</small></span>
    </button>`;
  html += owners[section].map(o => `
    <button type="button" class="choice" data-owner="${o.id}" aria-pressed="${selected[section] === o.id}">
      <span class="c-pic" aria-hidden="true">${o.icon}</span>
      <span><b>${esc(o.name)}</b><small>${esc(isFamily ? o.relationship : o.type)} · ${word(countFor(section, o.id))}</small></span>
    </button>`).join("");
  $("choices").innerHTML = html;
}

function fillTypeFilter() {                // only the types of the current category
  $("typeFilter").innerHTML = '<option value="">All appointment types</option>' +
    TYPES[section].map(t => `<option>${esc(t)}</option>`).join("");
}

// The appointment cards (with search + filters). Only the CURRENT category is used.
function showRecords() {
  const who = selected[section];
  const text = $("searchBox").value.trim().toLowerCase();
  const type = $("typeFilter").value, status = $("statusFilter").value;
  const from = $("dateFrom").value, to = $("dateTo").value;

  // Step 1: only the chosen person / pet (or all of this category)
  const base = data[section].filter(a => who === "all" || a.ownerId === who);

  // Step 2: search + filters
  const shown = base
    .filter(a => {
      const owner = ownerOf(section, a.ownerId);
      const matchText = !text || [a.title, owner.name, a.provider, a.place].some(s => s.toLowerCase().includes(text));
      return matchText && (!type || a.type === type) && (!status || a.status === status)
          && (!from || a.date >= from) && (!to || a.date <= to);
    })
    .sort((a, b) => {                      // Upcoming first (soonest first), then the others (newest first)
      const ua = a.status === "Upcoming", ub = b.status === "Upcoming";
      if (ua !== ub) return ua ? -1 : 1;
      const A = a.date + a.time, B = b.date + b.time;
      return ua ? A.localeCompare(B) : B.localeCompare(A);
    });

  const o = ownerOf(section, who);
  $("viewTitle").textContent = who === "all"
    ? (section === "family" ? "All Family Appointments" : "All Pet Appointments")
    : "Appointments for " + o.name + " (" + (section === "family" ? o.relationship : o.type) + ")";

  $("records").innerHTML = shown.map(cardHTML).join("");
  $("rangeErr").textContent = (from && to && from > to) ? "The “From” date must be before the “To” date." : "";

  $("records").hidden = shown.length === 0;
  $("emptyBox").hidden = base.length !== 0;                          // this person/pet has none at all
  $("noMatch").hidden = !(base.length > 0 && shown.length === 0);   // some exist, but nothing matches
  $("emptyTitle").textContent = who === "all" ? "No appointments yet" : "No appointments for " + o.name + " yet";
  $("resultCount").textContent = base.length === 0 ? "" : "Showing " + shown.length + " of " + word(base.length);
}

function cardHTML(a) {
  const o = ownerOf(section, a.ownerId), isFamily = section === "family";
  const who = isFamily ? `<span class="tag family">👤 ${esc(o.name)} · ${esc(o.relationship)}</span>`
                       : `<span class="tag pet">${o.icon} ${esc(o.name)} · ${esc(o.type)}</span>`;
  const mark = { Upcoming: "", Completed: "✔ ", Cancelled: "✖ " }[a.status];
  return `
    <article class="rec ${a.status === "Cancelled" ? "is-cancelled" : ""}">
      <div class="rec-top">
        <div class="rec-icon" aria-hidden="true">${TYPE_ICONS[a.type] || "📅"}</div>
        <div>
          <h3 class="rec-name">${esc(a.title)}</h3>
          <div class="rec-tags">${who}<span class="tag type">${esc(a.type)}</span><span class="tag status-${a.status.toLowerCase()}">${mark}${a.status}</span></div>
          <p class="rec-date">📅 ${formatDate(a.date)} · 🕘 ${formatTime(a.time)}</p>
        </div>
      </div>
      <div class="rec-body">
        <div><h4>${isFamily ? "Doctor" : "Veterinarian"}</h4><p>${esc(a.provider)}</p></div>
        <div><h4>Location</h4><p>${esc(a.place)}</p></div>
        ${a.notes ? `<div><h4>Notes</h4><p>${esc(a.notes)}</p></div>` : ""}
      </div>
      <div class="member-actions">
        <button type="button" class="btn" data-edit="${a.id}">✏️ Edit</button>
        <button type="button" class="btn btn-danger" data-delete="${a.id}">🗑 Delete</button>
      </div>
    </article>`;
}

function showAll() { showSummary(); showTabs(); showChoices(); showRecords(); }

/* ---------- 4. TABS, PROFILE BUTTONS, SEARCH, FILTERS ---------- */
function clearFilters() {
  ["searchBox", "typeFilter", "statusFilter", "dateFrom", "dateTo"].forEach(id => $(id).value = "");
}
document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => {
  if (section === tab.dataset.section) return;
  section = tab.dataset.section;
  fillTypeFilter(); clearFilters(); showAll();
}));
$("choices").addEventListener("click", e => {
  const btn = e.target.closest("[data-owner]");
  if (!btn) return;
  selected[section] = btn.dataset.owner;
  showChoices(); showRecords();
});
["input", "change"].forEach(evt =>
  ["searchBox", "typeFilter", "statusFilter", "dateFrom", "dateTo"].forEach(id => $(id).addEventListener(evt, showRecords)));
$("clearBtn").addEventListener("click", () => { clearFilters(); showRecords(); });
$("noMatchClear").addEventListener("click", () => { clearFilters(); showRecords(); });

/* ---------- 5. ADD / EDIT FORM ---------- */
const PARTS = ["Owner", "Title", "Type", "Date", "Time", "Provider", "Place"];

// Fill the form lists and labels for one category (family or pet)
function fillFormFor(sec) {
  const isFamily = sec === "family";
  $("aOwnerLabel").textContent = isFamily ? "Family Member" : "Pet";
  $("aProviderLabel").textContent = isFamily ? "Doctor Name" : "Veterinarian Name";
  $("aPlaceLabel").textContent = isFamily ? "Location (Hospital / Clinic)" : "Location (Veterinary Clinic)";
  $("aProvider").placeholder = isFamily ? "e.g. Dr. Fernando" : "e.g. Dr. Jayasuriya";
  $("aPlace").placeholder = isFamily ? "e.g. City Hospital" : "e.g. Happy Paws Veterinary Clinic";
  $("aOwner").innerHTML = '<option value="">Choose one…</option>' + owners[sec].map(o =>
    `<option value="${o.id}">${isFamily ? esc(o.relationship) + " – " + esc(o.name) : o.icon + " " + esc(o.name) + " – " + esc(o.type)}</option>`).join("");
  $("aType").innerHTML = '<option value="">Choose one…</option>' + TYPES[sec].map(t => `<option>${esc(t)}</option>`).join("");
}
$("aCategory").addEventListener("change", () => fillFormFor($("aCategory").value));

function clearErrors() {
  PARTS.forEach(p => { $("a" + p + "Err").textContent = ""; $("a" + p).setAttribute("aria-invalid", "false"); });
}

function openForm(id) {                    // id given = EDIT, no id = ADD
  clearErrors();
  editing = { section, id: id === undefined ? null : id };
  const a = data[section].find(x => x.id === editing.id);

  $("formTitle").textContent = a ? "Edit Appointment" : "Add New Appointment";
  $("saveBtn").textContent = a ? "Save Changes" : "Add Appointment";
  $("aCategory").value = section;
  $("aCategory").disabled = !!a;           // an existing appointment cannot change category
  $("catHint").hidden = !a;
  fillFormFor(section);

  $("aOwner").value = a ? a.ownerId : (selected[section] === "all" ? "" : selected[section]);
  $("aTitle").value = a ? a.title : "";
  $("aType").value = a ? a.type : "";
  $("aDate").value = a ? a.date : "";
  $("aTime").value = a ? a.time : "";
  $("aProvider").value = a ? a.provider : "";
  $("aPlace").value = a ? a.place : "";
  $("aNotes").value = a ? a.notes : "";
  $("aStatus").value = a ? a.status : "Upcoming";

  $("formDialog").showModal();
}

function setError(inputId, errId, text) {  // shows an error under a box; returns true if OK
  $(errId).textContent = text;
  $(inputId).setAttribute("aria-invalid", text ? "true" : "false");
  return !text;
}

$("apptForm").addEventListener("submit", e => {
  e.preventDefault();
  const sec = editing.id === null ? $("aCategory").value : editing.section;
  const isFamily = sec === "family";
  const ownerId = $("aOwner").value, title = $("aTitle").value.trim(), type = $("aType").value;
  const date = $("aDate").value, time = $("aTime").value;
  const provider = $("aProvider").value.trim(), place = $("aPlace").value.trim();
  const notes = $("aNotes").value.trim(), status = $("aStatus").value;

  const ok = [
    setError("aOwner", "aOwnerErr", ownerId ? "" : isFamily ? "Please choose a family member." : "Please choose a pet."),
    setError("aTitle", "aTitleErr", !title ? "Please enter a title." : title.length < 2 ? "The title is too short." : ""),
    setError("aType", "aTypeErr", type ? "" : "Please choose the appointment type."),
    setError("aDate", "aDateErr", !date ? "Please choose the date." : (date < "1990-01-01" || date > "2100-12-31") ? "Please check the year." : ""),
    setError("aTime", "aTimeErr", time ? "" : "Please choose the time."),
    setError("aProvider", "aProviderErr", provider ? "" : isFamily ? "Please enter the doctor's name." : "Please enter the veterinarian's name."),
    setError("aPlace", "aPlaceErr", place ? "" : "Please enter the location.")
  ];
  if (ok.includes(false)) return;          // stop if anything is wrong

  const appt = { ownerId, title, type, date, time, provider, place, notes, status };   // status = exactly what the user chose
  const name = ownerOf(sec, ownerId).name;
  if (editing.id === null) {               // ADD
    data[sec].push({ id: FP.newId(db), ...appt });
    showToast("Appointment added for " + name + " ✔");
  } else {                                 // EDIT
    Object.assign(data[sec].find(x => x.id === editing.id), appt);
    showToast("Appointment updated for " + name + " ✔");
  }

  FP.save(db);
  if (section !== sec) { section = sec; fillTypeFilter(); }   // jump to the right category
  selected[sec] = ownerId;                 // show the person/pet this appointment belongs to
  clearFilters();
  $("formDialog").close();
  showAll();
});
$("cancelForm").addEventListener("click", () => $("formDialog").close());

/* ---------- 6. DELETE WITH CONFIRMATION ---------- */
function openDelete(id) {
  deleting = { section, id };
  $("delName").textContent = data[section].find(x => x.id === id).title;
  $("deleteDialog").showModal();
}
$("confirmDelete").addEventListener("click", () => {
  data[deleting.section] = db.appointments[deleting.section] = data[deleting.section].filter(x => x.id !== deleting.id);
  FP.save(db);
  deleting = { section: null, id: null };
  $("deleteDialog").close();
  showAll();
  showToast("Appointment deleted");
});
$("cancelDelete").addEventListener("click", () => $("deleteDialog").close());

/* ---------- 7. BUTTONS ---------- */
$("addBtn").addEventListener("click", () => openForm());
$("emptyAddBtn").addEventListener("click", () => openForm());
$("records").addEventListener("click", e => {
  const edit = e.target.closest("[data-edit]"), del = e.target.closest("[data-delete]");
  if (edit) openForm(Number(edit.dataset.edit));
  if (del) openDelete(Number(del.dataset.delete));
});
document.querySelectorAll("dialog").forEach(d =>        // click outside a pop-up = close it
  d.addEventListener("click", e => { if (e.target === d) d.close(); }));

fillTypeFilter();
showAll();
