# Recall — Revision Planner

A lightweight, mobile-first spaced-revision planner that runs as a website or as an Android APK.

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
- Choose from editable review days. The default targets are day 1, 3, 7, 15, 30, 60, 90, 120, 180, and 365 after a topic’s start date.
- Backdate a topic by choosing a past start date; review target dates are calculated from that date.
- Mark each review complete to move to the next target day. Edit the sequence any time in Settings; completing the last review marks the plan complete.
- Topics are shown together under subject headings; selecting a subject filters the plan. Topics and their next review date can be edited.
- Filter all, due, and upcoming topics; see today’s review totals.
- Data is stored in the browser on this device. Export a JSON backup in Settings.
- Import an exported JSON backup on another install using Settings → Import backup.
- Responsive layout, offline app shell, and home-screen install support.
- The website can only check reminders while open. The Android APK schedules local notifications for upcoming review dates at the selected time, including while the app is closed. Android must allow notifications and exact alarms for the selected time.

Data stays local to each install and does not sync between devices. Export from the browser and import the backup in the APK to move existing topics.

## Build the Android APK

Android Studio and an Android SDK are required to build locally. With Node.js installed, run these commands in PowerShell:

```powershell
npm.cmd install
npm.cmd run android:add
npm.cmd run android:sync
npm.cmd run android:open
```

In Android Studio, build a debug APK. The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. After installing, open Recall and enable **Daily reminder** in Settings. Allow notifications and the Android **Alarms & reminders** access if requested. Reminder alarms are rescheduled whenever a topic or reminder setting changes.

The GitHub Actions workflow in `.github/workflows/build-android.yml` can also build an APK without Android Studio on your computer. Push the project to GitHub, then download the `recall-debug-apk` artifact from the workflow run in the repository’s Actions tab.

The website publishing workflow is `.github/workflows/deploy-pages.yml`. In the repository’s **Settings → Pages**, set the source to **GitHub Actions**.
