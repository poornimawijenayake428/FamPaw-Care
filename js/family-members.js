/* =========================================================
   FamPaw Care – Family Members page
   Family member data is shared across pages and saved in this browser's localStorage.
   ========================================================= */

/* ---------- 1. DATA (shared with every page through js/store.js) ---------- */
const db = FP.load();
let members = db.family;
let editingId = null;    // null = we are ADDING, otherwise the id of the member we are EDITING
let deletingId = null;   // member waiting for delete confirmation
function persist() { db.family = members; FP.save(db); }

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
function formatDate(iso) {                 // "1985-04-12" -> "12 Apr 1985"
  const p = iso.split("-");
  return Number(p[2]) + " " + MONTHS[Number(p[1]) - 1] + " " + p[0];
}
function ageFrom(iso) {                    // age in years
  const b = iso.split("-").map(Number), t = new Date();
  let age = t.getFullYear() - b[0];
  if (t.getMonth() + 1 < b[1] || (t.getMonth() + 1 === b[1] && t.getDate() < b[2])) age--;
  return age;
}

/* ---------- 3. SHOW THE PROFILE CARDS ---------- */
function showMembers() {
  $("cards").innerHTML = members.map((m, i) => `
    <article class="member">
      <div class="pic p${i % 4}" aria-hidden="true">${esc(m.name.charAt(0).toUpperCase())}</div>
      <h2>${esc(m.name)}</h2>
      <span class="tag">${esc(m.relationship)}</span>

      <div class="details">
        <div><span class="ico">🎂</span><span><small>Date of Birth</small>${formatDate(m.dob)} · ${ageFrom(m.dob)} yrs</span></div>
        <div><span class="ico">📞</span><span><small>Contact Number</small>${m.phone ? esc(m.phone) : '<span class="none">Not provided</span>'}</span></div>
      </div>

      <div class="member-actions">
        <button type="button" class="btn" data-edit="${m.id}">✏️ Edit</button>
        <button type="button" class="btn btn-danger" data-delete="${m.id}">🗑 Delete</button>
      </div>
    </article>`).join("");

  $("cards").hidden = members.length === 0;
  $("emptyBox").hidden = members.length !== 0;
  $("count").textContent = members.length === 1 ? "1 member" : members.length + " members";
}

/* ---------- 4. ADD / EDIT FORM ---------- */
function clearErrors() {
  ["nameErr", "relErr", "dobErr", "phoneErr"].forEach(id => $(id).textContent = "");
  ["fName", "fRel", "fDob", "fPhone"].forEach(id => $(id).setAttribute("aria-invalid", "false"));
}

function openForm(id) {                    // id given = EDIT, no id = ADD
  clearErrors();
  editingId = id === undefined ? null : id;
  const m = members.find(x => x.id === editingId);

  $("formTitle").textContent = m ? "Edit Family Member" : "Add Family Member";
  $("saveBtn").textContent = m ? "Save Changes" : "Add Member";
  $("fName").value = m ? m.name : "";
  $("fRel").value = m ? m.relationship : "";
  $("fDob").value = m ? m.dob : "";
  $("fPhone").value = m ? m.phone : "";
  $("fDob").max = todayISO();              // cannot choose a future birthday

  $("formDialog").showModal();
}

function setError(inputId, errId, text) {  // shows an error under a box; returns true if OK
  $(errId).textContent = text;
  $(inputId).setAttribute("aria-invalid", text ? "true" : "false");
  return !text;
}

$("memberForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("fName").value.trim(), rel = $("fRel").value;
  const dob = $("fDob").value, phone = $("fPhone").value.trim();

  const ok = [
    setError("fName", "nameErr", !name ? "Please enter the full name." : name.length < 2 ? "The name is too short." : ""),
    setError("fRel", "relErr", rel ? "" : "Please choose a relationship."),
    setError("fDob", "dobErr", !dob ? "Please choose the date of birth."
                             : dob > todayISO() ? "The date of birth cannot be in the future."
                             : dob < "1900-01-01" ? "Please check the year." : ""),
    setError("fPhone", "phoneErr", phone && !/^\+?[0-9\s-]{7,15}$/.test(phone)
                             ? "Use 7 to 15 digits. You may use spaces, - or + at the start." : "")
  ];
  if (ok.includes(false)) return;          // stop if anything is wrong

  if (editingId === null) {                // ADD
    members.push({ id: "m" + FP.newId(db), name, relationship: rel, dob, phone });
    showToast(name + " was added ✔");
  } else {                                 // EDIT
    const m = members.find(x => x.id === editingId);
    Object.assign(m, { name, relationship: rel, dob, phone });
    showToast(name + " was updated ✔");
  }
  persist();
  $("formDialog").close();
  showMembers();
});

/* ---------- 5. DELETE WITH CONFIRMATION ---------- */
function openDelete(id) {
  deletingId = id;
  $("delName").textContent = members.find(x => x.id === id).name;
  $("deleteDialog").showModal();
}
$("confirmDelete").addEventListener("click", () => {
  const m = members.find(x => x.id === deletingId);
  FP.removeOwner(db, "family", deletingId);   // also removes their records, appointments, vaccinations, reminders
  members = db.family;
  FP.save(db);
  deletingId = null;
  $("deleteDialog").close();
  showMembers();
  showToast((m ? m.name : "Member") + " was deleted");
});

/* ---------- 6. BUTTONS ---------- */
$("addBtn").addEventListener("click", () => openForm());
$("emptyAddBtn").addEventListener("click", () => openForm());
$("cancelForm").addEventListener("click", () => $("formDialog").close());
$("cancelDelete").addEventListener("click", () => $("deleteDialog").close());

// Edit / Delete buttons inside the cards
$("cards").addEventListener("click", e => {
  const edit = e.target.closest("[data-edit]"), del = e.target.closest("[data-delete]");
  if (edit) openForm(edit.dataset.edit);
  if (del) openDelete(del.dataset.delete);
});

// Click on the dark area outside a pop-up = close it
document.querySelectorAll("dialog").forEach(d =>
  d.addEventListener("click", e => { if (e.target === d) d.close(); }));

showMembers();
