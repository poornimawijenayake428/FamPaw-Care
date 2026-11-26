/* =========================================================
   FamPaw Care – Reminders page
   Add, edit, delete and tick reminders for family members and pets.
   The data is shared with every other page (js/store.js):
   ticking a reminder here updates the Dashboard numbers too.
   ========================================================= */

/* ---------- 1. DATA ---------- */
const db = FP.load();
const owners = FP.owners(db);
const { esc, todayISO } = FP;

let view = "pending";        // "pending", "done" or "all"
let editingId = null;        // null = adding
let deletingId = null;

/* ---------- 2. SMALL HELPERS ---------- */
const $ = id => document.getElementById(id);
const isOver = r => !r.done && r.due < todayISO();

/* ---------- 3. SHOW THE PAGE ---------- */
function showSummary() {
  const t = todayISO();
  $("sPending").textContent = db.reminders.filter(r => !r.done).length;
  $("sToday").textContent = db.reminders.filter(r => !r.done && r.due === t).length;
  $("sOver").textContent = db.reminders.filter(isOver).length;
  $("sDone").textContent = db.reminders.filter(r => r.done).length;
}

function showTabs() {
  document.querySelectorAll(".tab").forEach(tab => tab.setAttribute("aria-selected", tab.dataset.view === view));
  $("numPending").textContent = db.reminders.filter(r => !r.done).length;
  $("numDone").textContent = db.reminders.filter(r => r.done).length;
  $("numAll").textContent = db.reminders.length;
}

function fillWhoFilter() {
  $("whoFilter").innerHTML = '<option value="">Everyone and all pets</option>' +
    (owners.family.length ? '<optgroup label="Family">' + owners.family.map(o => `<option value="family:${esc(o.id)}">${esc(o.name)}</option>`).join("") + "</optgroup>" : "") +
    (owners.pet.length ? '<optgroup label="Pets">' + owners.pet.map(o => `<option value="pet:${esc(o.id)}">${o.icon} ${esc(o.name)}</option>`).join("") + "</optgroup>" : "");
}

function showList() {
  const text = $("searchBox").value.trim().toLowerCase(), who = $("whoFilter").value;

  const base = db.reminders.filter(r => view === "all" || (view === "done") === r.done);
  const shown = base
    .filter(r => {
      const name = FP.ownerName(db, r.section, r.ownerId);
      return (!text || r.title.toLowerCase().includes(text) || name.toLowerCase().includes(text))
          && (!who || who === r.section + ":" + r.ownerId);
    })
    .sort((a, b) => (a.done - b.done) || (a.done ? b.due.localeCompare(a.due) : a.due.localeCompare(b.due)));

  $("remList").className = "list rem-list";
  $("remList").innerHTML = shown.map(r => {
    const name = FP.ownerName(db, r.section, r.ownerId);
    const cls = r.done ? "done" : isOver(r) ? "" : "";
    const dueCls = r.done ? "" : isOver(r) ? "due-over" : r.due === todayISO() ? "due-today" : "";
    return `<li class="rem ${cls}">
      <input type="checkbox" id="rem${r.id}" data-id="${r.id}" ${r.done ? "checked" : ""}>
      <label for="rem${r.id}" class="info ${dueCls}"><strong>${esc(r.title)}</strong><small>${esc(name)} · ${esc(FP.dueText(r.due))}</small></label>
      <span class="tag ${r.section}">${r.section === "pet" ? "Pet" : "Family"}</span>
      <span class="rem-actions">
        <button type="button" class="btn" data-edit="${r.id}" aria-label="Edit ${esc(r.title)}">✏️ Edit</button>
        <button type="button" class="btn btn-danger" data-delete="${r.id}" aria-label="Delete ${esc(r.title)}">🗑</button>
      </span>
    </li>`;
  }).join("");

  const filtering = !!(text || who);
  $("listPanel").hidden = shown.length === 0;
  $("emptyBox").hidden = shown.length !== 0;
  $("emptyTitle").textContent = filtering ? "No reminders found"
    : view === "done" ? "Nothing completed yet" : view === "pending" ? "No pending reminders" : "No reminders yet";
  $("emptyText").textContent = filtering ? "Try a different search, or clear the filters."
    : view === "pending" ? "You are all caught up!" : view === "done" ? "Tick a reminder when it is done." : "Add your first reminder to get started.";
  $("resultCount").textContent = base.length === 0 ? "" : "Showing " + shown.length + " of " + base.length + (base.length === 1 ? " reminder" : " reminders");
}

function showAll() { showSummary(); showTabs(); showList(); }

/* ---------- 4. TABS, SEARCH, FILTERS, TICK BOXES ---------- */
document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => { view = tab.dataset.view; showAll(); }));
$("searchBox").addEventListener("input", showList);
$("whoFilter").addEventListener("change", showList);
$("clearBtn").addEventListener("click", () => { $("searchBox").value = ""; $("whoFilter").value = ""; showList(); });

$("remList").addEventListener("change", e => {
  const r = db.reminders.find(x => x.id === Number(e.target.dataset.id));
  if (!r) return;
  r.done = e.target.checked;
  FP.save(db);
  showAll();
  showToast(r.done ? "Marked as done ✔" : "Moved back to pending");
});

/* ---------- 5. ADD / EDIT FORM ---------- */
function fillOwners(sec) {
  const isFamily = sec === "family";
  $("rOwnerLabel").textContent = isFamily ? "Family Member" : "Pet";
  $("rOwner").innerHTML = '<option value="">Choose one…</option>' + owners[sec].map(o =>
    `<option value="${esc(o.id)}">${isFamily ? esc(o.relationship) + " – " + esc(o.name) : o.icon + " " + esc(o.name) + " – " + esc(o.type)}</option>`).join("");
}
$("rCategory").addEventListener("change", () => fillOwners($("rCategory").value));

function setError(inputId, errId, text) {
  $(errId).textContent = text;
  $(inputId).setAttribute("aria-invalid", text ? "true" : "false");
  return !text;
}

function openForm(id) {
  ["rOwner", "rTitle", "rDue"].forEach(f => setError(f, f + "Err", ""));
  editingId = id === undefined ? null : id;
  const r = db.reminders.find(x => x.id === editingId);
  const sec = r ? r.section : "family";

  $("formTitle").textContent = r ? "Edit Reminder" : "Add Reminder";
  $("saveBtn").textContent = r ? "Save Changes" : "Add Reminder";
  $("rCategory").value = sec;
  fillOwners(sec);
  $("rOwner").value = r ? r.ownerId : "";
  $("rTitle").value = r ? r.title : "";
  $("rDue").value = r ? r.due : todayISO();
  $("formDialog").showModal();
}

$("remForm").addEventListener("submit", e => {
  e.preventDefault();
  const sec = $("rCategory").value, ownerId = $("rOwner").value;
  const title = $("rTitle").value.trim(), due = $("rDue").value;
  const ok = [
    setError("rOwner", "rOwnerErr", ownerId ? "" : sec === "family" ? "Please choose a family member." : "Please choose a pet."),
    setError("rTitle", "rTitleErr", !title ? "Please write the reminder." : title.length < 3 ? "The reminder is too short." : ""),
    setError("rDue", "rDueErr", !due ? "Please choose the due date." : (due < "1990-01-01" || due > "2100-12-31") ? "Please check the year." : "")
  ];
  if (ok.includes(false)) return;

  if (editingId === null) {
    db.reminders.push({ id: FP.newId(db), title, section: sec, ownerId, due, done: false });
    showToast("Reminder added ✔");
    view = "pending";
  } else {
    Object.assign(db.reminders.find(x => x.id === editingId), { title, section: sec, ownerId, due });
    showToast("Reminder updated ✔");
  }
  FP.save(db);
  $("searchBox").value = ""; $("whoFilter").value = "";
  $("formDialog").close();
  showAll();
});
$("cancelForm").addEventListener("click", () => $("formDialog").close());

/* ---------- 6. DELETE WITH CONFIRMATION ---------- */
function openDelete(id) {
  deletingId = id;
  $("delName").textContent = db.reminders.find(x => x.id === id).title;
  $("deleteDialog").showModal();
}
$("confirmDelete").addEventListener("click", () => {
  db.reminders = db.reminders.filter(x => x.id !== deletingId);
  FP.save(db);
  deletingId = null;
  $("deleteDialog").close();
  showAll();
  showToast("Reminder deleted");
});
$("cancelDelete").addEventListener("click", () => $("deleteDialog").close());

/* ---------- 7. BUTTONS ---------- */
$("addBtn").addEventListener("click", () => openForm());
$("emptyAddBtn").addEventListener("click", () => openForm());
$("remList").addEventListener("click", e => {
  const edit = e.target.closest("[data-edit]"), del = e.target.closest("[data-delete]");
  if (edit) openForm(Number(edit.dataset.edit));
  if (del) openDelete(Number(del.dataset.delete));
});
document.querySelectorAll("dialog").forEach(d =>
  d.addEventListener("click", e => { if (e.target === d) d.close(); }));

fillWhoFilter();
showAll();
