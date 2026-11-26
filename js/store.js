/* =========================================================
   FamPaw Care – SHARED DATA + LOGIN SESSION (used by every page)
   ---------------------------------------------------------
   All pages read and write the SAME data through this file, so
   a change made on one page shows up everywhere (Dashboard,
   Health Records, Appointments, Vaccinations, Reminders...).

   Where is the data kept?  In this browser (localStorage).
   Each account has its own data. Later, replace load() and
   save() with calls to a real server / database.

   Load this file FIRST on every page inside the app:
     <script src="js/store.js" data-guard></script>
   "data-guard" sends visitors who are not logged in to login.html.
   ========================================================= */
const FP = (() => {
  const USERS_KEY = "fampaw:users";
  const SESSION_KEY = "fampaw:session";
  const dataKey = email => "fampaw:data:" + email;

  /* ---------- tiny helpers (shared by all pages) ---------- */
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const PET_ICONS = { Dog: "🐶", Cat: "🐱", Rabbit: "🐰", Bird: "🐦", Fish: "🐟", Hamster: "🐹", Other: "🐾" };

  function esc(text) {
    const d = document.createElement("div");
    d.textContent = text == null ? "" : text;
    return d.innerHTML;
  }
  function todayISO() {
    const t = new Date();
    return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
  }
  function addDaysISO(iso, days) {
    const p = iso.split("-").map(Number), d = new Date(p[0], p[1] - 1, p[2] + days);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function formatDate(iso) {
    if (!iso) return "";
    const p = iso.split("-");
    return Number(p[2]) + " " + MONTHS[Number(p[1]) - 1] + " " + p[0];
  }
  function formatTime(t) {
    const h = Number(t.slice(0, 2));
    return (h % 12 || 12) + ":" + t.slice(3, 5) + " " + (h >= 12 ? "PM" : "AM");
  }

  /* ---------- safe storage (works even if the browser blocks it) ---------- */
  const memory = {};
  function read(key) {
    try { const v = localStorage.getItem(key); return v === null ? null : JSON.parse(v); }
    catch (e) { return key in memory ? JSON.parse(memory[key]) : null; }
  }
  function write(key, value) {
    const text = JSON.stringify(value);
    try { localStorage.setItem(key, text); } catch (e) { memory[key] = text; }
  }
  function remove(key) {
    try { localStorage.removeItem(key); } catch (e) { delete memory[key]; }
  }

  // The login session may be stored in sessionStorage when Remember Me is off.
  // Always read the active session from either storage so data saves correctly.
  function activeSession() {
    let s = read(SESSION_KEY);
    if (!s) {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        s = raw ? JSON.parse(raw) : null;
      } catch (e) { s = null; }
    }
    return s;
  }

  /* ---------- passwords (demo: scrambled with a simple hash, never plain text) ---------- */
  function hashPassword(pw) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < pw.length; i++) {
      const c = pw.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
  }

  /* ---------- accounts ---------- */
  const DEMO = { first: "Nimali", last: "Perera", email: "nimali@example.com", password: "FamPaw123" };

  function users() {
    let list = read(USERS_KEY);
    if (!list) {                                   // first visit: create the demo account
      list = [{ first: DEMO.first, last: DEMO.last, email: DEMO.email, pw: hashPassword(DEMO.password), family: "Perera Family" }];
      write(USERS_KEY, list);
      write(dataKey(DEMO.email), sampleData());
    }
    return list;
  }
  function findUser(email) {
    email = String(email || "").trim().toLowerCase();
    return users().find(u => u.email === email) || null;
  }
  function register(first, last, email, password) {
    email = email.trim().toLowerCase();
    if (findUser(email)) return { ok: false, error: "An account with this email already exists. Please log in." };
    const list = users();
    list.push({ first, last, email, pw: hashPassword(password), family: last + " Family" });
    write(USERS_KEY, list);
    write(dataKey(email), emptyData());              // a new account starts with no data
    return { ok: true };
  }
  function login(email, password, remember = false) {
    const u = findUser(email);
    if (!u || u.pw !== hashPassword(password)) return { ok: false, error: "The email or password is not correct." };
    // Remember Me keeps the session after closing the browser; otherwise it ends with this tab/session.
    remove(SESSION_KEY);
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
    try {
      if (remember) localStorage.setItem(SESSION_KEY, JSON.stringify({ email: u.email }));
      else sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email: u.email }));
    } catch (e) { write(SESSION_KEY, { email: u.email }); }
    return { ok: true };
  }
  function logout() { remove(SESSION_KEY); try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {} }
  function session() {                              // the logged-in user, or null
    const s = activeSession();
    if (!s) return null;
    const u = findUser(s.email);
    return u ? { email: u.email, first: u.first, last: u.last, name: u.first + " " + u.last, family: u.family } : null;
  }
  function updateUser(changes) {
    const s = activeSession(); if (!s) return;
    const list = users(), u = list.find(x => x.email === s.email);
    Object.assign(u, changes); write(USERS_KEY, list);
  }
  function checkPassword(pw) { const s = activeSession(), u = s && findUser(s.email); return !!u && u.pw === hashPassword(pw); }
  function setPassword(pw) { updateUser({ pw: hashPassword(pw) }); }
  function resetPasswordForEmail(email, pw) {
    const u = findUser(email);
    if (!u) return { ok: false, error: "No account was found for that email address." };
    const list = users();
    const target = list.find(x => x.email === u.email);
    target.pw = hashPassword(pw);
    write(USERS_KEY, list);
    return { ok: true };
  }
  function deleteAccount() {
    const s = activeSession(); if (!s) return;
    write(USERS_KEY, users().filter(u => u.email !== s.email));
    remove(dataKey(s.email)); remove(SESSION_KEY);
  }

  /* ---------- the family's data ---------- */
  function emptyData() {
    return { family: [], pets: [], records: { family: [], pet: [] }, appointments: { family: [], pet: [] },
             vaccinations: [], reminders: [], nextId: 1 };
  }
  function load() {
    const s = activeSession();
    if (!s) return emptyData();
    return read(dataKey(s.email)) || emptyData();
  }
  function save(db) { const s = activeSession(); if (s) write(dataKey(s.email), db); }
  function newId(db) { return db.nextId++; }
  function resetToSample() { const s = activeSession(); if (s) write(dataKey(s.email), sampleData()); }
  function clearData() { const s = activeSession(); if (s) write(dataKey(s.email), emptyData()); }

  /* People and pets in the shape the pages need.
     section "family" -> family members, "pet" -> pets */
  function owners(db) {
    return {
      family: db.family.map(m => ({ id: m.id, name: m.name, relationship: m.relationship, icon: m.name.charAt(0).toUpperCase() })),
      pet: db.pets.map(p => ({ id: p.id, name: p.name, type: p.type, icon: PET_ICONS[p.type] || "🐾" }))
    };
  }
  function ownerName(db, section, id) {
    const o = (section === "pet" ? db.pets : db.family).find(x => x.id === id);
    return o ? o.name : "Unknown";
  }

  /* Deleting a person or a pet also removes everything that belongs to them,
     so no page is left showing a record for someone who no longer exists. */
  function removeOwner(db, section, id) {
    const keep = x => x.ownerId !== id;
    db.records[section] = db.records[section].filter(keep);
    db.appointments[section] = db.appointments[section].filter(keep);
    db.vaccinations = db.vaccinations.filter(v => !(v.section === section && v.ownerId === id));
    db.reminders = db.reminders.filter(r => !(r.section === section && r.ownerId === id));
    if (section === "family") {
      db.family = db.family.filter(m => m.id !== id);
      db.pets.forEach(p => { if (p.ownerId === id) p.ownerId = ""; });   // the pet stays, it just needs a new owner
    } else {
      db.pets = db.pets.filter(p => p.id !== id);
    }
  }

  /* Vaccination status is worked out from the dates (never typed by hand) */
  function vaccineStatus(v) {
    if (!v.nextDue) return "Completed";
    const today = todayISO();
    if (v.nextDue < today) return "Overdue";
    if (v.nextDue <= addDaysISO(today, 30)) return "Due soon";
    return "Up to date";
  }
  /* "Today", "Tomorrow", "Overdue · 24 Nov" or "28 Nov" */
  function dueText(iso) {
    const today = todayISO();
    if (iso === today) return "Today";
    if (iso === addDaysISO(today, 1)) return "Tomorrow";
    if (iso < today) return "Overdue · " + formatDate(iso).replace(/ \d{4}$/, "");
    return formatDate(iso);
  }

  /* ---------- sample data for the demo account ---------- */
  function sampleData() {
    const t = todayISO();
    return {
      nextId: 100,
      family: [
        { id: "nimali", name: "Nimali Perera", relationship: "Mother",   dob: "1985-04-12", phone: "077 555 0101" },
        { id: "sunil",  name: "Sunil Perera",  relationship: "Father",   dob: "1982-09-30", phone: "077 555 0102" },
        { id: "kasun",  name: "Kasun Perera",  relationship: "Son",      dob: "2012-09-03", phone: "077 555 0103" },
        { id: "amaya",  name: "Amaya Perera",  relationship: "Daughter", dob: "2015-02-18", phone: "" }
      ],
      pets: [
        { id: "bruno", name: "Bruno", type: "Dog", breed: "Labrador Retriever", dob: "2020-03-14", gender: "Male",   ownerId: "kasun" },
        { id: "luna",  name: "Luna",  type: "Cat", breed: "Domestic Shorthair",  dob: "2022-07-09", gender: "Female", ownerId: "amaya" }
      ],
      records: {
        family: [
          { id: 1,  ownerId: "nimali", title: "Yearly check-up", type: "General Check-up", date: "2026-10-28", description: "Yearly health check at the family clinic.", notes: "Blood pressure was normal. The doctor suggested drinking more water and walking regularly.", treatment: "" },
          { id: 2,  ownerId: "nimali", title: "Vitamin D tablets", type: "Medication", date: "2026-11-10", description: "Started a daily vitamin after a routine blood test.", notes: "The test showed a low vitamin D level.", treatment: "Vitamin D tablet once a day with food, as told by the doctor." },
          { id: 3,  ownerId: "nimali", title: "Headaches", type: "Illness", date: "2026-08-30", description: "Headaches for two days.", notes: "The doctor suggested more rest and less screen time.", treatment: "Paracetamol as advised by the doctor." },
          { id: 4,  ownerId: "sunil", title: "Dust and pollen allergy", type: "Allergy", date: "2026-08-05", description: "Sneezing and itchy eyes during the rainy season.", notes: "The doctor noted a mild dust and pollen allergy.", treatment: "Allergy tablet only when needed, as advised by the doctor." },
          { id: 5,  ownerId: "sunil", title: "Fever and sore throat", type: "Illness", date: "2026-09-14", description: "Fever and a sore throat for three days.", notes: "The doctor said it was a viral throat infection. Rest and fluids were advised. Fully recovered after one week.", treatment: "Rest, warm drinks, and paracetamol as advised." },
          { id: 6,  ownerId: "sunil", title: "Blood sugar test", type: "General Check-up", date: "2026-06-12", description: "Routine blood sugar test at the clinic.", notes: "The result was normal.", treatment: "" },
          { id: 7,  ownerId: "kasun", title: "School eye test", type: "General Check-up", date: "2026-09-20", description: "Eye test after Kasun said the board was blurry at school.", notes: "The eye doctor found slight short-sightedness and suggested reading glasses.", treatment: "Reading glasses, as advised by the eye doctor." },
          { id: 8,  ownerId: "kasun", title: "Cold and cough", type: "Illness", date: "2026-10-05", description: "Cold and cough for four days.", notes: "The doctor said it was a common cold. Rest was advised.", treatment: "Rest and warm drinks." },
          { id: 9,  ownerId: "kasun", title: "Dental check", type: "General Check-up", date: "2026-07-22", description: "Six-monthly visit to the dentist.", notes: "Teeth are healthy. One small cavity was filled.", treatment: "" },
          { id: 10, ownerId: "amaya", title: "Pollen allergy", type: "Allergy", date: "2026-11-15", description: "Sneezing and watery eyes when playing in the garden.", notes: "The doctor noted a mild pollen allergy.", treatment: "Allergy syrup when needed, as advised by the doctor." },
          { id: 11, ownerId: "amaya", title: "School health check", type: "Other", date: "2026-08-12", description: "Height and weight were checked at school.", notes: "Growth is normal for her age.", treatment: "" },
          { id: 12, ownerId: "amaya", title: "Stomach ache", type: "Illness", date: "2026-10-21", description: "Stomach ache after a birthday party.", notes: "The doctor said it was a mild upset stomach. It improved after one day of light food.", treatment: "Light food and plenty of water." }
        ],
        pet: [
          { id: 13, ownerId: "bruno", title: "Yearly rabies vaccine", type: "Vaccination", date: "2026-11-12", description: "Rabies vaccine given at Happy Paws Vet.", notes: "No reaction after the vaccine.", treatment: "", vaccination: "Rabies vaccine. Next dose due in November 2027." },
          { id: 14, ownerId: "bruno", title: "Itchy skin", type: "Illness", date: "2026-06-20", description: "Bruno kept scratching his back and sides.", notes: "The vet found mild skin irritation, probably from fleas.", treatment: "Anti-flea treatment, as advised by the vet.", vaccination: "" },
          { id: 15, ownerId: "bruno", title: "Annual vet visit", type: "Veterinary Visit", date: "2026-04-02", description: "Yearly check-up at Happy Paws Vet.", notes: "Healthy weight. Heart and lungs sounded normal.", treatment: "", vaccination: "" },
          { id: 16, ownerId: "luna", title: "Routine vet visit", type: "Veterinary Visit", date: "2026-09-02", description: "Routine check-up at Happy Paws Vet.", notes: "Healthy weight. Teeth and coat in good condition.", treatment: "", vaccination: "" },
          { id: 17, ownerId: "luna", title: "Sneezing after new litter", type: "Allergy", date: "2026-07-18", description: "Luna sneezed a lot after we changed her cat litter.", notes: "The vet thinks the scented litter may have caused it. We changed back to unscented litter.", treatment: "", vaccination: "" },
          { id: 18, ownerId: "luna", title: "Cat flu vaccine", type: "Vaccination", date: "2026-05-10", description: "Yearly cat flu vaccine at Happy Paws Vet.", notes: "Luna was calm and had no reaction.", treatment: "", vaccination: "Cat flu vaccine. Booster due in May 2027." }
        ]
      },
      appointments: {
        family: [
          { id: 21, ownerId: "nimali", title: "Dental cleaning", type: "Dental Appointment", date: "2026-12-04", time: "10:30", provider: "Dr. Fernando", place: "Smile Care Dental Clinic", notes: "Six-monthly dental check.", status: "Upcoming" },
          { id: 22, ownerId: "nimali", title: "Yearly health check", type: "General Check-up", date: "2026-10-28", time: "09:00", provider: "Dr. Wijesinghe", place: "Lanka Family Clinic", notes: "Yearly check-up. Nothing to worry about.", status: "Completed" },
          { id: 23, ownerId: "sunil", title: "Allergy review", type: "Specialist Consultation", date: "2026-12-10", time: "15:00", provider: "Dr. Mendis", place: "City Hospital", notes: "Follow-up about the dust and pollen allergy.", status: "Upcoming" },
          { id: 24, ownerId: "sunil", title: "Blood test review", type: "General Check-up", date: "2026-06-12", time: "08:30", provider: "Dr. Wijesinghe", place: "Lanka Family Clinic", notes: "Routine blood sugar test.", status: "Completed" },
          { id: 25, ownerId: "kasun", title: "Eye check-up", type: "Eye Check-up", date: "2026-12-02", time: "09:00", provider: "Dr. Silva", place: "Vision Plus Eye Centre", notes: "Check that the reading glasses are working well.", status: "Upcoming" },
          { id: 26, ownerId: "kasun", title: "Dental check", type: "Dental Appointment", date: "2026-07-22", time: "11:00", provider: "Dr. Fernando", place: "Smile Care Dental Clinic", notes: "Six-monthly visit. One small cavity was filled.", status: "Completed" },
          { id: 27, ownerId: "amaya", title: "Allergy consultation", type: "Specialist Consultation", date: "2026-12-15", time: "14:00", provider: "Dr. Mendis", place: "City Hospital", notes: "Talk about the pollen allergy.", status: "Upcoming" },
          { id: 28, ownerId: "amaya", title: "School health check", type: "Other", date: "2026-08-12", time: "10:00", provider: "School Nurse", place: "Sunrise International School", notes: "Height and weight check.", status: "Completed" },
          { id: 29, ownerId: "amaya", title: "Dental check", type: "Dental Appointment", date: "2026-11-18", time: "16:00", provider: "Dr. Fernando", place: "Smile Care Dental Clinic", notes: "Cancelled because Amaya was unwell. Book a new date.", status: "Cancelled" }
        ],
        pet: [
          { id: 30, ownerId: "bruno", title: "Tick and flea check", type: "Veterinary Check-up", date: "2026-12-08", time: "16:00", provider: "Dr. Jayasuriya", place: "Happy Paws Veterinary Clinic", notes: "Ask about a monthly flea treatment.", status: "Upcoming" },
          { id: 31, ownerId: "bruno", title: "Rabies vaccine", type: "Vaccination Appointment", date: "2026-11-12", time: "10:00", provider: "Dr. Jayasuriya", place: "Happy Paws Veterinary Clinic", notes: "Yearly rabies vaccine given.", status: "Completed" },
          { id: 32, ownerId: "bruno", title: "Bath and grooming", type: "Grooming Appointment", date: "2026-12-20", time: "11:00", provider: "Nadeeka (Groomer)", place: "Pawsh Grooming Studio", notes: "Full bath and nail trim.", status: "Upcoming" },
          { id: 33, ownerId: "luna", title: "Yearly vet check-up", type: "Veterinary Check-up", date: "2026-11-25", time: "15:00", provider: "Dr. Jayasuriya", place: "Happy Paws Veterinary Clinic", notes: "Bring Luna in her carrier.", status: "Upcoming" },
          { id: 34, ownerId: "luna", title: "Cat flu vaccine", type: "Vaccination Appointment", date: "2026-05-10", time: "10:30", provider: "Dr. Jayasuriya", place: "Happy Paws Veterinary Clinic", notes: "Yearly cat flu vaccine given.", status: "Completed" },
          { id: 35, ownerId: "luna", title: "Litter allergy follow-up", type: "Follow-up Visit", date: "2026-07-25", time: "16:30", provider: "Dr. Jayasuriya", place: "Happy Paws Veterinary Clinic", notes: "Not needed: Luna stopped sneezing.", status: "Cancelled" }
        ]
      },
      vaccinations: [
        { id: 41, section: "pet", ownerId: "bruno", vaccine: "Rabies vaccine", date: "2026-11-12", nextDue: "2027-11-12", provider: "Dr. Jayasuriya", notes: "No reaction after the vaccine." },
        { id: 42, section: "pet", ownerId: "bruno", vaccine: "DHPP (distemper combination)", date: "2025-12-18", nextDue: addDaysISO(t, 20), provider: "Dr. Jayasuriya", notes: "Yearly booster." },
        { id: 43, section: "pet", ownerId: "luna",  vaccine: "Cat flu vaccine", date: "2026-05-10", nextDue: "2027-05-10", provider: "Dr. Jayasuriya", notes: "Calm, no reaction." },
        { id: 44, section: "pet", ownerId: "luna",  vaccine: "Rabies vaccine", date: "2025-11-10", nextDue: addDaysISO(t, -1), provider: "Dr. Jayasuriya", notes: "Yearly booster. Book a new date." },
        { id: 45, section: "family", ownerId: "kasun", vaccine: "Influenza (flu) vaccine", date: "2026-03-05", nextDue: "2027-03-05", provider: "Dr. Wijesinghe", notes: "" },
        { id: 46, section: "family", ownerId: "amaya", vaccine: "Typhoid vaccine", date: "2024-06-14", nextDue: "", provider: "Dr. Wijesinghe", notes: "Course completed." },
        { id: 47, section: "family", ownerId: "nimali", vaccine: "Tetanus booster", date: "2016-09-01", nextDue: addDaysISO(t, 12), provider: "Dr. Wijesinghe", notes: "Ten-year booster." }
      ],
      reminders: [
        { id: 51, title: "Give Bruno his tick medicine", section: "pet",    ownerId: "bruno",  due: t, done: false },
        { id: 52, title: "Take vitamin D",               section: "family", ownerId: "nimali", due: t, done: false },
        { id: 53, title: "Book Luna's vaccine",          section: "pet",    ownerId: "luna",   due: addDaysISO(t, -1), done: false },
        { id: 54, title: "Pick up Kasun's reading glasses", section: "family", ownerId: "kasun", due: addDaysISO(t, 3), done: false },
        { id: 55, title: "Buy Luna's unscented litter",  section: "pet",    ownerId: "luna",   due: addDaysISO(t, -4), done: true }
      ]
    };
  }

  /* ---------- page guard ---------- */
  const script = document.currentScript;
  if (script && script.hasAttribute("data-guard") && !session()) {
    window.location.replace("login.html");
  }

  return { esc, todayISO, addDaysISO, formatDate, formatTime, MONTHS, PET_ICONS,
           users, register, login, logout, session, updateUser, checkPassword, setPassword, resetPasswordForEmail, deleteAccount, DEMO,
           load, save, newId, owners, ownerName, removeOwner, vaccineStatus, dueText, resetToSample, clearData };
})();
