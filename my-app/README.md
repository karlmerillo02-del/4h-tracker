# 4H Tracker

A static, offline-capable heat-index guide. It has no build step or third-party runtime dependencies.

## Run locally

From this folder, run:

```powershell
python -m http.server 8000
```

Open `http://localhost:8000` in a modern browser. Localhost is treated as a secure context for service-worker testing. For phone installation and normal deployment, serve the app over HTTPS. Open it once while online and allow the service worker to finish caching the app files; it can then calculate decisions offline.

## Notes

- Enter measured indoor classroom temperature and relative humidity; do not guess. A weather app may show nearby outdoor conditions, not classroom readings, and offline data may be stale. Do not enter outdoor values as room measurements. If you do not have a thermometer and humidity meter, ask your school to provide or lend them and follow local guidance until then.
- Let the measuring device settle in the occupied area, following its instructions. Keep it away from direct sun, windows, fans, air conditioners, and hot equipment.
- The linked DepEd guidance describes classroom readings at 8 a.m., noon, and 2 p.m.; follow your school's current instructions.
- Readings stay on the page until you explicitly save them. Saved history, including optional room names, stays in this browser's local storage on this device and does not sync. Browser data clearing or uninstalling can remove it.
- Export saved readings as a CSV for spreadsheets. Exported files are separate copies; store them securely. The app can delete saved readings from its local history.
- Heat-index results are withheld below 27°C or below 40% humidity.
- The 4H cutoffs follow the linked DepEd guidance. Heat index is estimated with the NOAA/NWS Rothfusz method; the linked DepEd page does not specify that equation. Confirm the current signed memo's requirements before operational use.
- If you change the app files, increment `CACHE_NAME` in `sw.js` so installed copies receive the update.
- Spoken announcements are short and use a local system voice. Available voices and sound quality depend on the device; voice input is not enabled.
