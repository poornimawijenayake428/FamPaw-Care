/* =========================================================
   FamPaw Care – Health Records page
   Two sections: Family Health and Pet Health.
   All the records below are SAMPLE DATA (fictional).
   They live only in this page's memory: refresh = back to the start.
   Later, the database will save the real data.
   ========================================================= */

/* ---------- 1. SAMPLE DATA ---------- */

// The family members and the pets (the real ones, shared with every page through js/store.js)
const db = FP.load();
const people = FP.owners(db);
const familyMembers = people.family;
const pets = people.pet;
const owners = people;

// Record types for each section
const TYPES = {
  family: ["General Check-up", "Illness", "Allergy", "Medication", "Other"],
  pet:    ["Veterinary Visit", "Vaccination", "Illness", "Allergy", "Medication", "Other"]
};
const TYPE_ICONS = { "General Check-up": "🩺", "Veterinary Visit": "🩺", "Illness": "🤒", "Allergy": "🤧",
                     "Medication": "💊", "Vaccination": "💉", "Other": "📝" };

// Every record has an ownerId: the id of ONE family member or ONE pet.
const data = db.records;

// What is on the screen right now
let section = "family";                          // "family" or "pet"
const selected = { family: "all", pet: "all" };  // "all" or one person's / pet's id
let editing = { section: null, id: null };       // which record the form is editing (id null = adding)
let deleting = { section: null, id: null };      // which record waits for delete confirmation

/* ---------- 2. SMALL HELPERS ---------- */
const $ = id => document.getElementById(id);
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function esc(text) {                       // makes text safe before showing it
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
}
function todayISO() {                      // today as "2026-11-18"
  const t = new Date();
  return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
}
function formatDate(iso) {                 // "2026-10-28" -> "28 Oct 2026"
  const p = iso.split("-");
  return Number(p[2]) + " " + MONTHS[Number(p[1]) - 1] + " " + p[0];
}
function ownerOf(sec, ownerId) {           // the person or pet a record belongs to
  return owners[sec].find(o => o.id === ownerId);
}
function recordWord(n) { return n === 1 ? "1 record" : n + " records"; }
function countFor(sec, ownerId) {          // how many records one person/pet (or "all") has
  return data[sec].filter(r => ownerId === "all" || r.ownerId === ownerId).length;
}

/* ---------- 3. SHOW THE PAGE ---------- */

// Tabs: Family Health / Pet Health
function showTabs() {
  ["family", "pet"].forEach(sec => {
    const tab = $(sec === "family" ? "tabFamily" : "tabPet");
    tab.setAttribute("aria-selected", sec === section);
    $(sec === "family" ? "numFamily" : "numPet").textContent = data[sec].length;
  });
  $("addBtn").textContent = section === "family" ? "＋ Add Family Record" : "＋ Add Pet Record";
}

// Profile buttons: "View All ..." + one for each person / pet
function showChoices() {
  const isFamily = section === "family";
  let html = `<button type="button" class="choice all" data-owner="all" aria-pressed="${selected[section] === "all"}">
      <span class="c-pic" aria-hidden="true">${isFamily ? "👨‍👩‍👧" : "🐾"}</span>
      <span><b>${isFamily ? "View All Family Records" : "View All Pet Records"}</b><small>${recordWord(countFor(section, "all"))}</small></span>
    </button>`;
  html += owners[section].map(o => `
    <button type="button" class="choice" data-owner="${o.id}" aria-pressed="${selected[section] === o.id}">
      <span class="c-pic" aria-hidden="true">${o.icon}</span>
      <span><b>${esc(o.name)}</b><small>${esc(isFamily ? o.relationship : o.type)} · ${recordWord(countFor(section, o.id))}</small></span>
    </button>`).join("");
  $("choices").innerHTML = html;
}

// The "Record Type" filter lists only the types of the current section
function fillTypeFilter() {
  $("typeFilter").innerHTML = '<option value="">All record types</option>' +
    TYPES[section].map(t => `<option>${esc(t)}</option>`).join("");
}

// The record cards (with search + filters). Only records of the CURRENT section are used.
function showRecords() {
  const who = selected[section];
  const text = $("searchBox").value.trim().toLowerCase();
  const type = $("typeFilter").value, from = $("dateFrom").value, to = $("dateTo").value;

  // Step 1: only the chosen person / pet (or all of this section)
  const base = data[section].filter(r => who === "all" || r.ownerId === who);

  // Step 2: search + filters
  const shown = base
    .filter(r => {
      const owner = ownerOf(section, r.ownerId);
      const matchText = !text || r.title.toLowerCase().includes(text) || owner.name.toLowerCase().includes(text);
      const matchType = !type || r.type === type;
      const matchFrom = !from || r.date >= from;
      const matchTo = !to || r.date <= to;
      return matchText && matchType && matchFrom && matchTo;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);      // newest first

  // Title above the list
  const o = ownerOf(section, who);
  $("viewTitle").textContent = who === "all"
    ? (section === "family" ? "All Family Records" : "All Pet Records")
    : "Records for " + o.name + " (" + (section === "family" ? o.relationship : o.type) + ")";

  $("records").innerHTML = shown.map(r => cardHTML(r)).join("");

  // Date range check
  $("rangeErr").textContent = (from && to && from > to) ? "The “From” date must be before the “To” date." : "";

  // Which message to show?
  $("records").hidden = shown.length === 0;
  $("emptyBox").hidden = base.length !== 0;                              // this person/pet has no records at all
  $("noMatch").hidden = !(base.length > 0 && shown.length === 0);       // records exist, but nothing matches
  $("emptyTitle").textContent = who === "all" ? "No health records yet" : "No records for " + o.name + " yet";
  $("resultCount").textContent = base.length === 0 ? "" : "Showing " + shown.length + " of " + recordWord(base.length);
}

// One record card. Family cards show name + relationship; pet cards show name + pet type.
function cardHTML(r) {
  const o = ownerOf(section, r.ownerId);
  const tag = section === "family"
    ? `<span class="tag family">👤 ${esc(o.name)} · ${esc(o.relationship)}</span>`
    : `<span class="tag pet">${o.icon} ${esc(o.name)} · ${esc(o.type)}</span>`;
  return `
    <article class="rec">
      <div class="rec-top">
        <div class="rec-icon" aria-hidden="true">${TYPE_ICONS[r.type] || "📝"}</div>
        <div>
          <h3 class="rec-name">${esc(r.title)}</h3>
          <div class="rec-tags">${tag}<span class="tag type">${esc(r.type)}</span></div>
          <p class="rec-date">📅 ${formatDate(r.date)}</p>
        </div>
      </div>
      <div class="rec-body">
        <div><h4>Description</h4><p>${esc(r.description)}</p></div>
        <div><h4>${section === "family" ? "Diagnosis / Health Notes" : "Veterinary Notes"}</h4><p>${esc(r.notes)}</p></div>
        ${r.treatment ? `<div><h4>Medication / Treatment</h4><p>${esc(r.treatment)}</p></div>` : ""}
        ${r.vaccination ? `<div><h4>Vaccination Details</h4><p>${esc(r.vaccination)}</p></div>` : ""}
      </div>
      <div class="member-actions">
        <button type="button" class="btn" data-edit="${r.id}">✏️ Edit</button>
        <button type="button" class="btn btn-danger" data-delete="${r.id}">🗑 Delete</button>
      </div>
    </article>`;
}

function showAll() { showTabs(); showChoices(); showRecords(); }

/* ---------- 4. TABS, PROFILE BUTTONS, SEARCH, FILTERS ---------- */
function clearFilters() {
  $("searchBox").value = ""; $("typeFilter").value = ""; $("dateFrom").value = ""; $("dateTo").value = "";
}

// Click a tab: switch between Family Health and Pet Health
document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => {
  if (section === tab.dataset.section) return;
  section = tab.dataset.section;
  fillTypeFilter();
  clearFilters();
  showAll();
}));

// Click a profile button: show that person / pet (or "View All")
$("choices").addEventListener("click", e => {
  const btn = e.target.closest("[data-owner]");
  if (!btn) return;
  selected[section] = btn.dataset.owner;
  showChoices();
  showRecords();
});

["input", "change"].forEach(evt =>
  [$("searchBox"), $("typeFilter"), $("dateFrom"), $("dateTo")].forEach(el => el.addEventListener(evt, showRecords)));
$("clearBtn").addEventListener("click", () => { clearFilters(); showRecords(); });
$("noMatchClear").addEventListener("click", () => { clearFilters(); showRecords(); });

/* ---------- 5. ADD / EDIT FORMS ---------- */
// The two forms use the same ids with a different first letter:
//   family form: fOwner, fTitle, fType, fDate, fDesc, fNotes, fTreat
//   pet form:    pOwner, pTitle, pType, pDate, pDesc, pNotes, pTreat, pVacc
const prefix = sec => sec === "family" ? "f" : "p";
const PARTS = ["Owner", "Title", "Type", "Date", "Desc", "Notes"];

// Fill the dropdown lists of both forms
$("fOwner").innerHTML = '<option value="">Choose one…</option>' +
  familyMembers.map(m => `<option value="${m.id}">${esc(m.relationship)} – ${esc(m.name)}</option>`).join("");
$("pOwner").innerHTML = '<option value="">Choose one…</option>' +
  pets.map(p => `<option value="${p.id}">${p.icon} ${esc(p.name)} – ${esc(p.type)}</option>`).join("");
["family", "pet"].forEach(sec => {
  $(prefix(sec) + "Type").innerHTML = '<option value="">Choose one…</option>' +
    TYPES[sec].map(t => `<option>${esc(t)}</option>`).join("");
});

// Vaccination Details box: only for the type "Vaccination"
function toggleVaccination() { $("pVaccWrap").hidden = $("pType").value !== "Vaccination"; }
$("pType").addEventListener("change", toggleVaccination);

function clearErrors(sec) {
  const P = prefix(sec);
  PARTS.forEach(part => {
    $(P + part + "Err").textContent = "";
    $(P + part).setAttribute("aria-invalid", "false");
  });
}

function openForm(sec, id) {               // id given = EDIT, no id = ADD
  const P = prefix(sec);
  clearErrors(sec);
  editing = { section: sec, id: id === undefined ? null : id };
  const r = data[sec].find(x => x.id === editing.id);

  $(sec + "FormTitle").textContent = (r ? "Edit " : "Add ") + (sec === "family" ? "Family" : "Pet") + " Health Record";
  $(sec + "SaveBtn").textContent = r ? "Save Changes" : "Add Record";
  // When adding, pre-select the person/pet that is chosen on the page
  $(P + "Owner").value = r ? r.ownerId : (selected[sec] === "all" ? "" : selected[sec]);
  $(P + "Title").value = r ? r.title : "";
  $(P + "Type").value = r ? r.type : "";
  $(P + "Date").value = r ? r.date : "";
  $(P + "Desc").value = r ? r.description : "";
  $(P + "Notes").value = r ? r.notes : "";
  $(P + "Treat").value = r ? r.treatment : "";
  $(P + "Date").max = todayISO();          // a record cannot be in the future
  if (sec === "pet") { $("pVacc").value = r && r.vaccination ? r.vaccination : ""; toggleVaccination(); }

  $(sec + "Dialog").showModal();
}

function setError(inputId, errId, text) {  // shows an error under a box; returns true if OK
  $(errId).textContent = text;
  $(inputId).setAttribute("aria-invalid", text ? "true" : "false");
  return !text;
}

function saveRecord(sec) {
  const P = prefix(sec);
  const ownerId = $(P + "Owner").value, title = $(P + "Title").value.trim(), type = $(P + "Type").value;
  const date = $(P + "Date").value, description = $(P + "Desc").value.trim(), notes = $(P + "Notes").value.trim();
  const treatment = $(P + "Treat").value.trim();

  const ok = [
    setError(P + "Owner", P + "OwnerErr", ownerId ? "" : sec === "family" ? "Please choose a family member." : "Please choose a pet."),
    setError(P + "Title", P + "TitleErr", !title ? "Please enter a title." : title.length < 2 ? "The title is too short." : ""),
    setError(P + "Type", P + "TypeErr", type ? "" : "Please choose the record type."),
    setError(P + "Date", P + "DateErr", !date ? "Please choose the date."
                                      : date > todayISO() ? "The date cannot be in the future."
                                      : date < "1990-01-01" ? "Please check the year." : ""),
    setError(P + "Desc", P + "DescErr", description ? "" : "Please write a short description."),
    setError(P + "Notes", P + "NotesErr", notes ? "" : sec === "family" ? "Please write the diagnosis or health notes." : "Please write the veterinary notes.")
  ];
  if (ok.includes(false)) return;          // stop if anything is wrong

  const record = { ownerId, title, type, date, description, notes, treatment };
  if (sec === "pet") record.vaccination = type === "Vaccination" ? $("pVacc").value.trim() : "";

  const name = ownerOf(sec, ownerId).name;
  if (editing.id === null) {               // ADD
    data[sec].push({ id: FP.newId(db), ...record });
    showToast("Record added for " + name + " ✔");
  } else {                                 // EDIT
    Object.assign(data[sec].find(x => x.id === editing.id), record);
    showToast("Record updated for " + name + " ✔");
  }

  FP.save(db);
  selected[sec] = ownerId;                 // show the person/pet this record belongs to
  clearFilters();
  $(sec + "Dialog").close();
  showAll();
}

$("familyForm").addEventListener("submit", e => { e.preventDefault(); saveRecord("family"); });
$("petForm").addEventListener("submit", e => { e.preventDefault(); saveRecord("pet"); });
$("familyCancel").addEventListener("click", () => $("familyDialog").close());
$("petCancel").addEventListener("click", () => $("petDialog").close());

/* ---------- 6. DELETE WITH CONFIRMATION ---------- */
function openDelete(sec, id) {
  deleting = { section: sec, id };
  $("delName").textContent = data[sec].find(x => x.id === id).title;
  $("deleteDialog").showModal();
}
$("confirmDelete").addEventListener("click", () => {
  data[deleting.section] = db.records[deleting.section] = data[deleting.section].filter(x => x.id !== deleting.id);
  FP.save(db);
  deleting = { section: null, id: null };
  $("deleteDialog").close();
  showAll();
  showToast("Record deleted");
});
$("cancelDelete").addEventListener("click", () => $("deleteDialog").close());

/* ---------- 7. BUTTONS ---------- */
$("addBtn").addEventListener("click", () => openForm(section));
$("emptyAddBtn").addEventListener("click", () => openForm(section));

// Edit / Delete buttons inside the cards (cards always belong to the current section)
$("records").addEventListener("click", e => {
  const edit = e.target.closest("[data-edit]"), del = e.target.closest("[data-delete]");
  if (edit) openForm(section, Number(edit.dataset.edit));
  if (del) openDelete(section, Number(del.dataset.delete));
});

// Click on the dark area outside a pop-up = close it
document.querySelectorAll("dialog").forEach(d =>
  d.addEventListener("click", e => { if (e.target === d) d.close(); }));

fillTypeFilter();
showAll();
