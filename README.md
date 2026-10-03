# Recall — Revision Planner

A lightweight, mobile-first spaced-revision planner that runs in a browser and can be installed as a home-screen app (PWA).

## Run it locally

The app is static and has no build step. Serve this folder from a local web server, then open its URL in your browser. For example, if Python is installed:

```sh
python -m http.server 8000
```

Open `http://localhost:8000`. For phone use, the phone and computer need to be on the same Wi-Fi network and you should open `http://<computer-local-IP>:8000`. Browsers generally require HTTPS for installation and notifications outside localhost, so to install it from your phone, publish the folder to an HTTPS static host (such as GitHub Pages or Netlify), then use your browser’s **Add to Home Screen** option.

## Features

- Add as many topics as you need, with an optional subject.
- Set the first review for tomorrow, 2 days, 3 days, or one week.
- Mark a review complete to schedule the next one at 1, 3, 7, 14, then 30 day intervals.
- Filter all, due, and upcoming topics; see today’s review totals.
- Data is stored in the browser on this device. Export a JSON backup in Settings.
- Responsive layout, offline app shell, and home-screen install support.

Data is local to the browser and is not synced between devices. The reminder setting requests notification permission, but a browser page cannot reliably schedule future background notifications on all phones; use the phone’s browser/site notification controls if reminders are needed.
