/* =========================================================
   FamPaw Care – Login and Register behaviour
   Used by login.html and register.html
   ========================================================= */

const $ = id => document.getElementById(id);

/* ---------- Show / hide password (both pages) ---------- */
document.querySelectorAll(".eye").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = $(btn.dataset.target);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
  });
});

/* =========================================================
   LOGIN PAGE
   ========================================================= */
if ($("loginForm")) {
  const DASHBOARD_PAGE = "dashboard.html";   // where to go after logging in
  const msg = $("msg");

  // Already logged in? Go straight to the Dashboard (not right after pressing Log out)
  const params = new URLSearchParams(window.location.search);
  if (FP.session() && !params.has("out")) window.location.replace(DASHBOARD_PAGE);
  if (params.has("out")) { msg.className = "msg"; msg.textContent = "You have been logged out."; }
  if (params.has("registered")) { msg.className = "msg"; msg.textContent = "Account created! Please log in."; }
  const known = params.get("email"); if (known) $("email").value = known;

  $("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    msg.className = "msg";
    const email = $("email").value.trim(), pw = $("password").value;
    if (!email || !pw) { msg.className = "msg error"; msg.textContent = "Please enter your email and password."; return; }
    const result = FP.login(email, pw, $("rememberMe")?.checked || false);
    if (!result.ok) { msg.className = "msg error"; msg.textContent = result.error; return; }
    msg.textContent = "Welcome back to FamPaw Care!";
    window.location.href = DASHBOARD_PAGE;
  });

  // "Forgot Password" and the social buttons need a real server, so we say so clearly
  const note = text => { msg.className = "msg"; msg.textContent = text; };
  document.querySelectorAll(".btn-social").forEach(b => b.addEventListener("click", () =>
    note("Social sign-in is not available yet. Please log in with your email.")));
}

/* =========================================================
   REGISTER PAGE
   ========================================================= */
if ($("regForm")) {

  /* SETTINGS – edit these */
  const LOGIN_PAGE = "login.html";   // where to go after signing up
  const MIN_PASSWORD_LENGTH = 8;

  // Creates the account in this browser (js/store.js). Replace with a real server later.
  let createError = "";
  function createAccount(data) {
    const result = FP.register(data.first, data.last, data.email, data.password);
    createError = result.error || "";
    return result.ok;
  }

  const msg = $("msg");

  function setError(inputId, errId, text) {
    $(errId).textContent = text;
    $(inputId).setAttribute("aria-invalid", text ? "true" : "false");
    return !text;
  }

  $("regForm").addEventListener("submit", function (e) {
    e.preventDefault();
    msg.className = "msg"; msg.textContent = "";

    const first = $("first").value.trim(), last = $("last").value.trim();
    const email = $("email").value.trim(), pw = $("password").value, conf = $("confirm").value;

    const results = [
      setError("first", "firstErr", first ? "" : "Please enter your first name."),
      setError("last", "lastErr", last ? "" : "Please enter your last name."),
      setError("email", "emailErr",
        !email ? "Please enter your email address."
        : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Please enter a valid email address." : ""),
      setError("password", "pwErr",
        !pw ? "Please create a password."
        : (pw.length < MIN_PASSWORD_LENGTH || !/[A-Za-z]/.test(pw) || !/\d/.test(pw))
          ? "Use at least " + MIN_PASSWORD_LENGTH + " characters, with a letter and a number." : ""),
      setError("confirm", "confErr",
        !conf ? "Please confirm your password."
        : conf !== pw ? "Passwords do not match." : "")
    ];
    const agreed = $("agree").checked;
    $("agreeErr").textContent = agreed ? "" : "Please agree to the Terms of Service and Privacy Policy.";

    if (results.includes(false) || !agreed) return;

    if (!createAccount({ first, last, email, password: pw })) {
      msg.className = "msg error";
      msg.textContent = createError || "We couldn’t create your account. Please try again.";
      return;
    }
    msg.textContent = "Account created! Taking you to the login page…";
    setTimeout(() => { window.location.href = LOGIN_PAGE + "?registered=1&email=" + encodeURIComponent(email); }, 1200);
  });
}
