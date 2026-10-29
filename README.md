# FitTrack — Eat · Track · Grow

A responsive nutrition and gym-analysis dashboard built with HTML, CSS, vanilla JavaScript, and Firebase Authentication + Cloud Firestore.

## Features in this first version

- Mobile + laptop responsive dashboard
- Calories, protein, carbohydrates, fat, and fiber totals
- Breakfast, lunch, dinner, and snack food logging
- Built-in food library plus custom food entries
- Quantity scaling by grams and price/cost logging in INR
- Day / week / month / year analytics and spending breakdowns
- Weight, height, waist, body-fat and biceps check-ins
- Editable daily nutrition and food budget goals
- Simple rule-based insights based on logged data
- Local browser save before Firebase is configured
- Firebase email/password account and per-user cloud data
- JSON data export for backups

## Run locally

Because this project uses JavaScript modules, serve the folder through a local web server rather than opening `index.html` as a `file://` URL.

Examples:

- VS Code: install/use the **Live Server** extension, then choose **Open with Live Server**.
- Python (if installed): open a terminal in this folder and run `python -m http.server 8000`, then visit `http://localhost:8000`.
- Deploy the folder to Firebase Hosting, Netlify, or another static host.

Internet access is required for Google Fonts and Firebase's CDN modules. Local demo mode still saves in the same browser when Firebase isn't configured.

## Set up Firebase cloud storage

1. Open https://console.firebase.google.com and create a Firebase project.
2. Add a **Web app** to the project and copy the web config.
3. Open `firebase-config.js` and replace every placeholder with the values from Firebase Project settings → General → Your apps.
4. In Firebase Console → **Authentication** → Sign-in method, enable **Email/Password**.
5. In Firebase Console → **Firestore Database**, create a database.
6. In Firestore **Rules**, paste the contents of `firestore.rules` and publish. These rules limit each signed-in user to their own `/users/{uid}/fittrack/data` document.
7. Serve or deploy the site over HTTP/HTTPS and reload. Click **Sign in / Connect Firebase**, then create an account.

The app stores the complete FitTrack data object in `users/{uid}/fittrack/data`. This is intentionally simple for a personal first version. Local browser storage is also kept as a convenience, but Firebase is the cross-device source once signed in. If you switch accounts on a device, sign out first; avoid using the same browser-local data as a shared family device.

### Security notes

- Do not put Firebase Admin SDK keys or service-account credentials in this website.
- The Firebase web API key is designed to be included in a client app; Firestore Security Rules and Authentication are what protect user data.
- Never publish permissive Firestore rules such as `allow read, write: if true`.
- If you later add an external food API, validate its values and keep API secrets on a backend.

## Nutrition accuracy

Built-in nutrition values are approximate reference values, generally per 100 g of edible food. Brands, recipes, water content, and cooking method change nutrition. Custom foods can be added with your own label values. Logged entries keep a snapshot of the calculated nutrition and cost so later food edits do not silently rewrite history.

## Current limitations / next improvements

- No automatic food-photo recognition or barcode scanner yet.
- Built-in values are illustrative reference estimates, not a clinical nutrition database.
- Analytics summarize logged entries only; missing meals are not treated as zero intake in average-day insights.
- Fitness suggestions are general informational prompts, not medical advice. Review goals with a qualified professional if you have a health condition or specific clinical needs.
- For a production multi-device app, consider splitting logs into individual Firestore documents and adding conflict handling, account deletion, and stronger error/retry UX.
