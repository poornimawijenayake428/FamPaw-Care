/* =========================================================
   FamPaw Care – Settings page
   Profile, password, data tools, log out and delete account.
   ========================================================= */
const $ = id => document.getElementById(id);
const me = FP.session();

function setError(inputId, errId, text) {
  $(errId).textContent = text;
  $(inputId).setAttribute("aria-invalid", text ? "true" : "false");
  return !text;
}

/* ---------- Profile ---------- */
function fillProfile() {
  const u = FP.session();
  $("sFirst").value = u.first || "";
  $("sLast").value = u.last || "";
  $("sFamily").value = u.family || "";
  $("sPhone").value = u.phone || "";
  $("sDob").value = u.dob || "";
  $("sGender").value = u.gender || "";
  $("sAddress").value = u.address || "";
  $("sEmail").value = u.email;
  $("accEmail").textContent = u.email;
}
$("profileForm").addEventListener("submit", e => {
  e.preventDefault();
  const first = $("sFirst").value.trim(), last = $("sLast").value.trim(), family = $("sFamily").value.trim();
  const phone = $("sPhone").value.trim(), dob = $("sDob").value, gender = $("sGender").value, address = $("sAddress").value.trim();
  const ok = [
    setError("sFirst", "sFirstErr", first ? "" : "Please enter your first name."),
    setError("sLast", "sLastErr", last ? "" : "Please enter your last name."),
    setError("sFamily", "sFamilyErr", family ? "" : "Please enter a name for your family group.")
  ];
  if (ok.includes(false)) return;
  FP.updateUser({ first, last, family, phone, dob, gender, address });
  const u = FP.session();                       // refresh the name in the top bar
  document.querySelectorAll(".user-name").forEach(el => el.textContent = u.name);
  document.querySelectorAll(".avatar").forEach(el => el.textContent = u.first.charAt(0).toUpperCase());
  showToast("Profile saved ✔");
});

/* ---------- Password ---------- */
$("pwForm").addEventListener("submit", e => {
  e.preventDefault();
  const old = $("pwOld").value, pw = $("pwNew").value, conf = $("pwConf").value;
  const ok = [
    setError("pwOld", "pwOldErr", !old ? "Please enter your current password." : FP.checkPassword(old) ? "" : "The current password is not correct."),
    setError("pwNew", "pwNewErr", !pw ? "Please create a new password."
      : (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) ? "Use at least 8 characters, with a letter and a number." : ""),
    setError("pwConf", "pwConfErr", !conf ? "Please confirm the new password." : conf !== pw ? "Passwords do not match." : "")
  ];
  if (ok.includes(false)) return;
  FP.setPassword(pw);
  $("pwForm").reset();
  showToast("Password updated ✔");
});

/* ---------- Your data ---------- */
function showSummary() {
  const db = FP.load();
  const rows = [
    ["👨‍👩‍👧", "Family members", db.family.length],
    ["🐶", "Pets", db.pets.length],
    ["📋", "Health records", db.records.family.length + db.records.pet.length],
    ["📅", "Appointments", db.appointments.family.length + db.appointments.pet.length],
    ["💉", "Vaccinations", db.vaccinations.length],
    ["🔔", "Reminders", db.reminders.length]
  ];
  $("dataSummary").innerHTML = rows.map(r => `<li><span class="ico" aria-hidden="true">${r[0]}</span><span>${r[1]}</span><span>${r[2]}</span></li>`).join("");
}

$("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(FP.load(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "fampaw-care-data.json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  showToast("Your data was downloaded ✔");
});

/* One confirmation pop-up is used for every risky action */
let onConfirm = null;
function ask(title, text, button, action) {
  $("cTitle").textContent = title; $("cText").textContent = text; $("cOk").textContent = button;
  onConfirm = action; $("confirmDialog").showModal();
}
$("cOk").addEventListener("click", () => { const f = onConfirm; onConfirm = null; $("confirmDialog").close(); if (f) f(); });
$("cCancel").addEventListener("click", () => { onConfirm = null; $("confirmDialog").close(); });
$("confirmDialog").addEventListener("click", e => { if (e.target === $("confirmDialog")) $("confirmDialog").close(); });

$("resetBtn").addEventListener("click", () => ask("Restore the sample data?",
  "Your current family members, pets, records, appointments, vaccinations and reminders will be replaced with the FamPaw Care sample data.",
  "Yes, restore", () => { FP.resetToSample(); showSummary(); showToast("Sample data restored ✔"); }));

$("clearBtn").addEventListener("click", () => ask("Delete all your data?",
  "All family members, pets, records, appointments, vaccinations and reminders will be deleted. Your account stays. This cannot be undone.",
  "Yes, delete all", () => { FP.clearData(); showSummary(); showToast("All data deleted"); }));

/* ---------- Delete account ---------- */
$("deleteAccBtn").addEventListener("click", () => ask("Delete your account?",
  "Your account and all of its data will be deleted from this browser, and you will be logged out. This cannot be undone.",
  "Yes, delete my account", () => { FP.deleteAccount(); window.location.href = "index.html"; }));

fillProfile();
showSummary();
