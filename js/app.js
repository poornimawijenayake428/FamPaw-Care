/* =========================================================
   FamPaw Care – SHARED page code (for pages inside the app)
   1. Open / close the menu on phones
   2. Small message at the bottom ("toast")
   3. Logged-in user, log out, and a safety net for any unfinished link
   ========================================================= */

/* ---------- Mobile menu ---------- */
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const menuBtn = document.getElementById("menuBtn");

function setMenu(open) {
  sidebar.classList.toggle("open", open);
  overlay.classList.toggle("show", open);
  menuBtn.setAttribute("aria-expanded", open);
}
menuBtn.addEventListener("click", () => setMenu(!sidebar.classList.contains("open")));
overlay.addEventListener("click", () => setMenu(false));
document.addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });

/* ---------- Small message at the bottom ---------- */
let toastTimer;
function showToast(text) {
  const toast = document.getElementById("toast");
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

/* ---------- Logged-in user (top bar) + Log out ---------- */
const currentUser = FP.session();
if (currentUser) {
  document.querySelectorAll(".user-name").forEach(el => el.textContent = currentUser.name);
  document.querySelectorAll(".avatar").forEach(el => el.textContent = currentUser.first.charAt(0).toUpperCase());
}
document.querySelectorAll("a[data-logout]").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    FP.logout();
    window.location.href = "login.html?out=1";
  });
});

/* ---------- "Coming soon" links (links that have the word data-soon) ---------- */
document.querySelectorAll("a[data-soon]").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    setMenu(false);
    showToast("This page is coming soon 🐾");
  });
});
