## DriveLite – Google Drive File Manager

DriveLite is a lightweight, client-side web app that lets you securely sign in with your Google account and browse your Google Drive with **read‑only** access. It’s built with plain **HTML, CSS, and JavaScript** using **Google Identity Services (GIS)** and the **Google Drive API v3**.

> Your files remain private. DriveLite uses read-only access to view and open files in Google Drive, without modifying or deleting anything.

---

## Features

- Google Sign‑In using **Google Identity Services (OAuth 2.0)**  
- **Read‑only** access to Google Drive files
- Auto-loads your **recent files** after login (sorted by `modifiedTime desc`)
- Search files by name
- File filters:
  - All
  - Folders
  - PDFs
  - Images
- File cards with:
  - File name
  - MIME type
  - Size
  - Last modified time
  - File‑type icons (folder, PDF, image, document, generic)
- File details **modal** with “Open in Google Drive” button
- Drive info panel (user email, storage used/limit)
- Modern dashboard‑style UI:
  - Glassmorphism login card
  - Gradient background and blurred header
  - Hover animations, soft shadows, responsive layout

---

## Project Structure

- `index.html` – App shell, layout, and DOM structure  
- `style.css` – All styling (layout, animations, responsive design)  
- `script.js` – OAuth flow, Drive API calls, and UI behavior

---

## Requirements

- A **Google Cloud project** with:
  - **Google Drive API** enabled
  - An **OAuth 2.0 Client ID** of type **Web application**
  - **Authorized JavaScript origin** set to your local dev URL (e.g. `http://localhost:3000`)
  - OAuth consent screen configured (External) and your Google account added as a **test user**
- Modern browser (Chrome, Edge, Firefox, etc.)

---

## OAuth & API Configuration

1. Go to **Google Cloud Console** → `APIs & Services` → `Credentials`.
2. Create (or reuse) an **OAuth 2.0 Client ID** with:
   - Application type: **Web application**
   - Authorized JavaScript origins: e.g. `http://localhost:3000`
3. Enable the **Google Drive API** in `APIs & Services` → `Library`.
4. Configure the **OAuth consent screen**:
   - User type: **External**
   - Add yourself as a **Test user**
5. In `script.js`, set your **Web OAuth client ID**:

```js
// script.js
const CLIENT_ID = "PASTE_YOUR_CLIENT_ID_HERE";
```

> Do **not** commit real client IDs or secrets to a public repo.

DriveLite uses the scope:

```text
https://www.googleapis.com/auth/drive.readonly
```

Tokens are held **in memory only** and are never stored in `localStorage` or `sessionStorage`.

---

## Running the App Locally

1. Place all files in a folder (e.g. `DriveLite/`).
2. Serve the folder with a simple static server so the origin is `http://localhost:3000` (or your chosen port). Examples:

   - **Node (http-server)**:
     ```bash
     npx http-server . -p 3000
     ```
   - **Python 3**:
     ```bash
     python -m http.server 3000
     ```

3. Open the app in your browser:
   ```text
   http://localhost:3000
   ```
4. Click **“Sign in with Google”**, grant read‑only access, and your Drive files will load.

---

## Security Notes

- Uses **Google Identity Services** (`https://accounts.google.com/gsi/client`) – no deprecated `gapi.auth2`.
- Access tokens are:
  - Stored **only in JavaScript memory**
  - Sent to Google APIs via the `Authorization: Bearer ACCESS_TOKEN` header
  - Not logged to the console
- Scope is limited to **Drive read‑only**; the app does **not** modify or delete files.

---

## Customization

- Update the visual design in `style.css` (colors, spacing, shadows, etc.).
- Tweak layout or text in `index.html` (e.g. branding, headings).
- Extend `script.js` with **additional read‑only features** (e.g. more filters, sorting) while keeping scopes unchanged.

---

## Disclaimer

DriveLite is a sample / educational project. Always review and comply with Google’s API Terms of Service and branding guidelines when deploying or sharing your application.


