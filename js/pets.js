/* =========================================================
   FamPaw Care – Pets page
   Pet data is shared across pages and saved in this browser's localStorage.
   ========================================================= */

/* ---------- 1. DATA (shared with every page through js/store.js) ---------- */
const db = FP.load();
let pets = db.pets;
// The owners are the real family members (same people as on the Family Members page)
const owners = db.family;
let editingId = null;    // null = we are ADDING, otherwise the id of the pet we are EDITING
let deletingId = null;   // pet waiting for delete confirmation
function persist() { db.pets = pets; FP.save(db); }
function ownerNameOf(id) { const o = (FP.load().family || []).find(m => m.id === id); return o ? o.name : ""; }

// A simple picture (emoji) for each pet type
const PET_ICONS = FP.PET_ICONS;

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
function formatDate(iso) {                 // "2020-03-14" -> "14 Mar 2020"
  const p = iso.split("-");
  return Number(p[2]) + " " + MONTHS[Number(p[1]) - 1] + " " + p[0];
}
function ageText(iso) {                    // "6 yrs" or "8 months"
  const b = iso.split("-").map(Number), t = new Date();
  let months = (t.getFullYear() - b[0]) * 12 + (t.getMonth() + 1 - b[1]);
  if (t.getDate() < b[2]) months--;
  if (months < 12) return Math.max(months, 0) + (months === 1 ? " month" : " months");
  const years = Math.floor(months / 12);
  return years + (years === 1 ? " yr" : " yrs");
}

/* ---------- 3. SHOW THE PET CARDS ---------- */
function showPets() {
  $("cards").innerHTML = pets.map((p, i) => `
    <article class="member">
      <div class="pic pet p${i % 4}" aria-hidden="true">${PET_ICONS[p.type] || "🐾"}</div>
      <h2>${esc(p.name)}</h2>
      <span class="tag type">${esc(p.type)}</span>

      <div class="details">
        <div><span class="ico">🦴</span><span><small>Breed</small>${p.breed ? esc(p.breed) : '<span class="none">Not specified</span>'}</span></div>
        <div><span class="ico">🎂</span><span><small>Date of Birth</small>${p.dob ? formatDate(p.dob) + " · " + ageText(p.dob) : '<span class="none">Not provided</span>'}</span></div>
        <div><span class="ico">⚥</span><span><small>Gender</small>${esc(p.gender)}</span></div>
        <div><span class="ico">👤</span><span><small>Owner</small>${ownerNameOf(p.ownerId) ? esc(ownerNameOf(p.ownerId)) : '<span class="none">No owner – please edit</span>'}</span></div>
      </div>

      <div class="member-actions">
        <button type="button" class="btn" data-edit="${p.id}">✏️ Edit</button>
        <button type="button" class="btn btn-danger" data-delete="${p.id}">🗑 Delete</button>
      </div>
    </article>`).join("");

  $("cards").hidden = pets.length === 0;
  $("emptyBox").hidden = pets.length !== 0;
  $("count").textContent = pets.length === 1 ? "1 pet" : pets.length + " pets";   // the pet count
}

/* ---------- 4. ADD / EDIT FORM ---------- */
// Refresh the Owner list every time the form opens, using the latest saved family list.
function refreshOwnerOptions(selectedId = "") {
  const latestFamily = FP.load().family || [];
  $("fOwner").innerHTML = '<option value="">Choose one…</option>' +
    latestFamily.map(m => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join("");
  $("fOwner").value = selectedId || "";
  $("fOwner").disabled = latestFamily.length === 0;
  if (latestFamily.length === 0) {
    $("ownerErr").textContent = "Please add a family member first on the Family Members page.";
  }
}

function clearErrors() {
  ["nameErr", "typeErr", "dobErr", "genderErr", "ownerErr"].forEach(id => $(id).textContent = "");
  ["fName", "fType", "fDob", "fGender", "fOwner"].forEach(id => $(id).setAttribute("aria-invalid", "false"));
}

function openForm(id) {                    // id given = EDIT, no id = ADD
  clearErrors();
  editingId = id === undefined ? null : id;
  const p = pets.find(x => x.id === editingId);

  $("formTitle").textContent = p ? "Edit Pet" : "Add New Pet";
  $("saveBtn").textContent = p ? "Save Changes" : "Add Pet";
  $("fName").value = p ? p.name : "";
  $("fType").value = p ? p.type : "";
  $("fBreed").value = p ? p.breed : "";
  $("fDob").value = p ? p.dob : "";
  $("fGender").value = p ? p.gender : "";
  refreshOwnerOptions(p ? p.ownerId : "");
  $("fDob").max = todayISO();              // cannot choose a future birthday

  $("formDialog").showModal();
}

function setError(inputId, errId, text) {  // shows an error under a box; returns true if OK
  $(errId).textContent = text;
  $(inputId).setAttribute("aria-invalid", text ? "true" : "false");
  return !text;
}

$("petForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("fName").value.trim(), type = $("fType").value, breed = $("fBreed").value.trim();
  const dob = $("fDob").value, gender = $("fGender").value, ownerId = $("fOwner").value;

  const ok = [
    setError("fName", "nameErr", !name ? "Please enter the pet's name." : name.length < 2 ? "The name is too short." : ""),
    setError("fType", "typeErr", type ? "" : "Please choose the pet type."),
    setError("fDob", "dobErr", dob > todayISO() ? "The date of birth cannot be in the future."
                             : dob && dob < "1990-01-01" ? "Please check the year." : ""),
    setError("fGender", "genderErr", gender ? "" : "Please choose the gender."),
    setError("fOwner", "ownerErr", ownerId ? "" : "Please choose the owner.")
  ];
  if (ok.includes(false)) return;          // stop if anything is wrong

  if (editingId === null) {                // ADD
    pets.push({ id: "p" + FP.newId(db), name, type, breed, dob, gender, ownerId });
    showToast(name + " was added ✔");
  } else {                                 // EDIT
    const p = pets.find(x => x.id === editingId);
    Object.assign(p, { name, type, breed, dob, gender, ownerId });
    showToast(name + " was updated ✔");
  }
  persist();
  $("formDialog").close();
  showPets();
});

/* ---------- 5. DELETE WITH CONFIRMATION ---------- */
function openDelete(id) {
  deletingId = id;
  $("delName").textContent = pets.find(x => x.id === id).name;
  $("deleteDialog").showModal();
}
$("confirmDelete").addEventListener("click", () => {
  const p = pets.find(x => x.id === deletingId);
  FP.removeOwner(db, "pet", deletingId);      // also removes its records, appointments, vaccinations, reminders
  pets = db.pets;
  FP.save(db);
  deletingId = null;
  $("deleteDialog").close();
  showPets();
  showToast((p ? p.name : "Pet") + " was deleted");
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

showPets();
