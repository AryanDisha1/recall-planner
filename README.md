# Recall — Revision Planner

A lightweight, mobile-first spaced-revision planner that runs in a browser and can be installed as a home-screen app (PWA).

## Run it locally

Install Node.js, open a terminal in this folder, then run:

```sh
npm install
npm run dev
```

On Windows PowerShell, if it blocks `npm`, use the command shim:

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local URL printed in the terminal (usually `http://localhost:5173`). To preview on a phone on the same Wi-Fi, use the Network URL Vite prints. Phone installation and offline features generally require HTTPS; deploy the static app to an HTTPS host such as GitHub Pages to install it from the phone’s **Add to Home Screen** option.

## Features

- Add subjects and group related topics into a subject plan.
- Choose from editable review days. The default targets are day 1, 3, 7, 15, 30, 60, 90, 120, 180, and 365 after adding a topic.
- Mark each review complete to move to the next target day. Edit the sequence any time in Settings; completing the last review marks the plan complete.
- Topics are shown together under subject headings; selecting a subject filters the plan. Topics and their next review date can be edited.
- Filter all, due, and upcoming topics; see today’s review totals.
- Data is stored in the browser on this device. Export a JSON backup in Settings.
- Responsive layout, offline app shell, and home-screen install support.

Data is local to the browser and is not synced between devices. The reminder setting requests notification permission, but a browser page cannot reliably schedule future background notifications on all phones; use the phone’s browser/site notification controls if reminders are needed.
