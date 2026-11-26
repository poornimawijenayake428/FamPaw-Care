/* =========================================================
   FamPaw Care – Vaccinations page
   Two categories: Family Vaccinations and Pet Vaccinations.
   The data is shared with every other page (js/store.js).
   The status (Up to date / Due soon / Overdue) is worked out
   from the "Next Dose Due" date.
   ========================================================= */

/* ---------- 1. DATA ---------- */
const db = FP.load();
const owners = FP.owners(db);              // { family: [...], pet: [...] }
const { esc, formatDate, todayISO } = FP;

let section = "family";                          // "family" or "pet"
const selected = { family: "all", pet: "all" };  // "all" or one person's / pet's id
let editing = { section: null, id: null };       // id null = adding
let deleting = null;

/* ---------- 2. SMALL HELPERS ---------- */
const $ = id => document.getElementById(id);
const list = sec => db.vaccinations.filter(v => v.section === sec);
const ownerOf = (sec, id) => owners[sec].find(o => o.id === id);
const word = n => n === 1 ? "1 vaccination" : n + " vaccinations";
const countFor = (sec, id) => list(sec).filter(v => id === "all" || v.ownerId === id).length;
const countStatus = s => db.vaccinations.filter(v => FP.vaccineStatus(v) === s).length;

/* ---------- 3. SHOW THE PAGE ---------- */
function showSummary() {
  $("sTotal").textContent = db.vaccinations.length;
  $("sOk").textContent = countStatus("Up to date");
  $("sSoon").textContent = countStatus("Due soon");
  $("sOver").textContent = countStatus("Overdue");
  $("sFamily").textContent = list("family").length;
  $("sPet").textContent = list("pet").length;
}

function showTabs() {
  ["family", "pet"].forEach(sec => {
    $(sec === "family" ? "tabFamily" : "tabPet").setAttribute("aria-selected", sec === section);
    $(sec === "family" ? "numFamily" : "numPet").textContent = list(sec).length;
  });
}

function showChoices() {
  const isFamily = section === "family";
  let html = `<button type="button" class="choice all" data-owner="all" aria-pressed="${selected[section] === "all"}">
      <span class="c-pic" aria-hidden="true">${isFamily ? "👨‍👩‍👧" : "🐾"}</span>
      <span><b>${isFamily ? "View All Family Vaccinations" : "View All Pet Vaccinations"}</b><small>${word(countFor(section, "all"))}</small></span>
    </button>`;
  html += owners[section].map(o => `
    <button type="button" class="choice" data-owner="${esc(o.id)}" aria-pressed="${selected[section] === o.id}">
      <span class="c-pic" aria-hidden="true">${o.icon}</span>
      <span><b>${esc(o.name)}</b><small>${esc(isFamily ? o.relationship : o.type)} · ${word(countFor(section, o.id))}</small></span>
    </button>`).join("");
  $("choices").innerHTML = html;
}

function showRecords() {
  const who = selected[section];
  const text = $("searchBox").value.trim().toLowerCase();
  const status = $("statusFilter").value, from = $("dateFrom").value, to = $("dateTo").value;

  const base = list(section).filter(v => who === "all" || v.ownerId === who);
  const shown = base
    .filter(v => {
      const o = ownerOf(section, v.ownerId);
      const matchText = !text || [v.vaccine, o ? o.name : "", v.provider || ""].some(s => s.toLowerCase().includes(text));
      return matchText && (!status || FP.vaccineStatus(v) === status) && (!from || v.date >= from) && (!to || v.date <= to);
    })
    .sort((a, b) => {                     // overdue / due soon first (earliest due date), then the rest (newest first)
      const A = a.nextDue || "9999", B = b.nextDue || "9999";
      return A.localeCompare(B) || b.date.localeCompare(a.date);
    });

  const o = ownerOf(section, who);
  $("viewTitle").textContent = who === "all"
    ? (section === "family" ? "All Family Vaccinations" : "All Pet Vaccinations")
    : "Vaccinations for " + o.name + " (" + (section === "family" ? o.relationship : o.type) + ")";

  $("records").innerHTML = shown.map(cardHTML).join("");
  $("rangeErr").textContent = (from && to && from > to) ? "The “From” date must be before the “To” date." : "";

  $("records").hidden = shown.length === 0;
  $("emptyBox").hidden = base.length !== 0;
  $("noMatch").hidden = !(base.length > 0 && shown.length === 0);
  const noOwners = owners[section].length === 0;
  $("emptyTitle").textContent = noOwners ? (section === "family" ? "No family members yet" : "No pets yet")
                              : who === "all" ? "No vaccinations yet" : "No vaccinations for " + o.name + " yet";
  $("emptyText").textContent = noOwners ? (section === "family" ? "Add a family member first, then you can add vaccinations." : "Add a pet first, then you can add vaccinations.")
                              : "Add the first vaccination to get started.";
  $("resultCount").textContent = base.length === 0 ? "" : "Showing " + shown.length + " of " + word(base.length);
}

function cardHTML(v) {
  const o = ownerOf(section, v.ownerId) || { name: "Unknown", relationship: "", type: "", icon: "?" };
  const isFamily = section === "family";
  const status = FP.vaccineStatus(v);
  const who = isFamily ? `<span class="tag family">👤 ${esc(o.name)} · ${esc(o.relationship)}</span>`
                       : `<span class="tag pet">${o.icon} ${esc(o.name)} · ${esc(o.type)}</span>`;
  const mark = { "Up to date": "✔ ", "Due soon": "⏳ ", "Overdue": "⚠ ", "Completed": "✔ " }[status];
  const hasReminder = db.reminders.some(r => r.vaccinationId === v.id);
  return `
    <article class="rec ${status === "Overdue" ? "is-overdue" : ""}">
      <div class="rec-top">
        <div class="rec-icon" aria-hidden="true">💉</div>
        <div>
          <h3 class="rec-name">${esc(v.vaccine)}</h3>
          <div class="rec-tags">${who}<span class="tag status-${status.toLowerCase().replace(/ /g, "-")}">${mark}${status}</span></div>
          <p class="rec-date">📅 Given ${formatDate(v.date)}</p>
        </div>
      </div>
      <div class="rec-body">
        <div><h4>Next Dose Due</h4><p>${v.nextDue ? formatDate(v.nextDue) : "No further dose needed"}</p></div>
        ${v.provider ? `<div><h4>${isFamily ? "Doctor" : "Veterinarian"}</h4><p>${esc(v.provider)}</p></div>` : ""}
        ${v.notes ? `<div><h4>Notes</h4><p>${esc(v.notes)}</p></div>` : ""}
      </div>
      <div class="member-actions">
        <button type="button" class="btn" data-edit="${v.id}">✏️ Edit</button>
        <button type="button" class="btn btn-danger" data-delete="${v.id}">🗑 Delete</button>
        ${v.nextDue ? `<button type="button" class="btn btn-remind" data-remind="${v.id}" ${hasReminder ? "disabled" : ""}>${hasReminder ? "🔔 Reminder set" : "🔔 Remind me"}</button>` : ""}
      </div>
    </article>`;
}

function showAll() { showSummary(); showTabs(); showChoices(); showRecords(); }

/* ---------- 4. TABS, PROFILE BUTTONS, SEARCH, FILTERS ---------- */
function clearFilters() { ["searchBox", "statusFilter", "dateFrom", "dateTo"].forEach(id => $(id).value = ""); }
document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => {
  if (section === tab.dataset.section) return;
  section = tab.dataset.section; clearFilters(); showAll();
}));
$("choices").addEventListener("click", e => {
  const btn = e.target.closest("[data-owner]"); if (!btn) return;
  selected[section] = btn.dataset.owner; showChoices(); showRecords();
});
["input", "change"].forEach(evt =>
  ["searchBox", "statusFilter", "dateFrom", "dateTo"].forEach(id => $(id).addEventListener(evt, showRecords)));
$("clearBtn").addEventListener("click", () => { clearFilters(); showRecords(); });
$("noMatchClear").addEventListener("click", () => { clearFilters(); showRecords(); });

/* ---------- 5. ADD / EDIT FORM ---------- */
const PARTS = ["Owner", "Vaccine", "Date", "Next"];

function fillFormFor(sec) {
  const isFamily = sec === "family";
  $("vOwnerLabel").textContent = isFamily ? "Family Member" : "Pet";
  $("vProviderLabel").innerHTML = (isFamily ? "Doctor Name" : "Veterinarian Name") + ' <span class="optional">(optional)</span>';
  $("vProvider").placeholder = isFamily ? "e.g. Dr. Wijesinghe" : "e.g. Dr. Jayasuriya";
  $("vOwner").innerHTML = '<option value="">Choose one…</option>' + owners[sec].map(o =>
    `<option value="${esc(o.id)}">${isFamily ? esc(o.relationship) + " – " + esc(o.name) : o.icon + " " + esc(o.name) + " – " + esc(o.type)}</option>`).join("");
}
$("vCategory").addEventListener("change", () => fillFormFor($("vCategory").value));

function clearErrors() {
  PARTS.forEach(p => { $("v" + p + "Err").textContent = ""; $("v" + p).setAttribute("aria-invalid", "false"); });
}
function setError(inputId, errId, text) {
  $(errId).textContent = text;
  $(inputId).setAttribute("aria-invalid", text ? "true" : "false");
  return !text;
}

function openForm(id) {
  clearErrors();
  editing = { section, id: id === undefined ? null : id };
  const v = db.vaccinations.find(x => x.id === editing.id);

  $("formTitle").textContent = v ? "Edit Vaccination" : "Add Vaccination";
  $("saveBtn").textContent = v ? "Save Changes" : "Add Vaccination";
  $("vCategory").value = section;
  $("vCategory").disabled = !!v;
  $("catHint").hidden = !v;
  fillFormFor(section);

  $("vOwner").value = v ? v.ownerId : (selected[section] === "all" ? "" : selected[section]);
  $("vVaccine").value = v ? v.vaccine : "";
  $("vDate").value = v ? v.date : "";
  $("vNext").value = v ? v.nextDue : "";
  $("vProvider").value = v ? v.provider : "";
  $("vNotes").value = v ? v.notes : "";
  $("vDate").max = todayISO();             // a vaccine that was already given cannot be in the future
  $("formDialog").showModal();
}

$("vaccForm").addEventListener("submit", e => {
  e.preventDefault();
  const sec = editing.id === null ? $("vCategory").value : editing.section;
  const isFamily = sec === "family";
  const ownerId = $("vOwner").value, vaccine = $("vVaccine").value.trim();
  const date = $("vDate").value, nextDue = $("vNext").value;
  const provider = $("vProvider").value.trim(), notes = $("vNotes").value.trim();

  const ok = [
    setError("vOwner", "vOwnerErr", ownerId ? "" : isFamily ? "Please choose a family member." : "Please choose a pet."),
    setError("vVaccine", "vVaccineErr", !vaccine ? "Please enter the vaccine name." : vaccine.length < 2 ? "The name is too short." : ""),
    setError("vDate", "vDateErr", !date ? "Please choose the date given."
                                : date > todayISO() ? "The date given cannot be in the future."
                                : date < "1990-01-01" ? "Please check the year." : ""),
    setError("vNext", "vNextErr", nextDue && date && nextDue < date ? "The next dose cannot be before the date given."
                                : nextDue > "2100-12-31" ? "Please check the year." : "")
  ];
  if (ok.includes(false)) return;

  const rec = { section: sec, ownerId, vaccine, date, nextDue, provider, notes };
  const name = FP.ownerName(db, sec, ownerId);
  if (editing.id === null) {
    db.vaccinations.push({ id: FP.newId(db), ...rec });
    showToast("Vaccination added for " + name + " ✔");
  } else {
    const v = db.vaccinations.find(x => x.id === editing.id);
    Object.assign(v, rec);
    // keep a linked reminder in step with the new due date
    db.reminders.filter(r => r.vaccinationId === v.id).forEach(r => {
      if (nextDue) { r.due = nextDue; r.title = vaccine + " due for " + name; } else { db.reminders = db.reminders.filter(x => x !== r); }
    });
    showToast("Vaccination updated for " + name + " ✔");
  }
  FP.save(db);

  if (section !== sec) section = sec;
  selected[sec] = ownerId;
  clearFilters();
  $("formDialog").close();
  showAll();
});
$("cancelForm").addEventListener("click", () => $("formDialog").close());

/* ---------- 6. REMIND ME (creates a real reminder on the Reminders page) ---------- */
function addReminder(id) {
  const v = db.vaccinations.find(x => x.id === id);
  if (!v || !v.nextDue || db.reminders.some(r => r.vaccinationId === id)) return;
  db.reminders.push({ id: FP.newId(db), title: v.vaccine + " due for " + FP.ownerName(db, v.section, v.ownerId),
                      section: v.section, ownerId: v.ownerId, due: v.nextDue, done: false, vaccinationId: v.id });
  FP.save(db);
  showRecords();
  showToast("Reminder added – see the Reminders page 🔔");
}

/* ---------- 7. DELETE WITH CONFIRMATION ---------- */
function openDelete(id) {
  deleting = id;
  const v = db.vaccinations.find(x => x.id === id);
  $("delName").textContent = v.vaccine + " (" + FP.ownerName(db, v.section, v.ownerId) + ")";
  $("deleteDialog").showModal();
}
$("confirmDelete").addEventListener("click", () => {
  db.vaccinations = db.vaccinations.filter(x => x.id !== deleting);
  db.reminders = db.reminders.filter(r => r.vaccinationId !== deleting);
  FP.save(db);
  deleting = null;
  $("deleteDialog").close();
  showAll();
  showToast("Vaccination deleted");
});
$("cancelDelete").addEventListener("click", () => $("deleteDialog").close());

/* ---------- 8. BUTTONS ---------- */
$("addBtn").addEventListener("click", () => openForm());
$("emptyAddBtn").addEventListener("click", () => openForm());
$("records").addEventListener("click", e => {
  const edit = e.target.closest("[data-edit]"), del = e.target.closest("[data-delete]"), rem = e.target.closest("[data-remind]");
  if (edit) openForm(Number(edit.dataset.edit));
  if (del) openDelete(Number(del.dataset.delete));
  if (rem) addReminder(Number(rem.dataset.remind));
});
document.querySelectorAll("dialog").forEach(d =>
  d.addEventListener("click", e => { if (e.target === d) d.close(); }));

showAll();
