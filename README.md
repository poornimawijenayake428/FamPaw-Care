# FamPaw Care – integrated browser project

## Start
1. Extract the ZIP file.
2. Open the `fampaw-care` folder.
3. Double-click `index.html` to open the Welcome page in a browser. No Flask, Python, or installation is required.

## Demo account
- Email: `nimali@example.com`
- Password: `FamPaw123`

You can also create a new demo account from the Register page.

## Pages included
Welcome, Login, Register, Forgot Password, Dashboard, Family Members, Pets, Health Records, Appointments, Vaccinations, Reminders, Settings, About, Help, Contact, Privacy Policy, and Terms of Service.

## Shared data and limitations
The application pages use `js/store.js` as a shared browser data layer. Data is saved in browser local storage, per account, so changes can appear across pages in the same browser. The Remember Me option stores the login session persistently; without it, the session is limited to the current browser session.

This is a front-end educational demo, not a production service. There is no server/database, real email password reset, Google/Apple authentication, multi-device sync, secure medical-data storage, real push notifications, or family-group permission system. Password reset changes the local demo account only. Social sign-in buttons display an explanatory message. Do not enter sensitive real-world medical information.

`original-files/` contains early standalone drafts and is not used by the integrated app.
\nProfile details: Users can edit their first name, last name, family group name, phone number, date of birth, gender and address from Settings > Your Profile. These details are saved locally in the browser.\n