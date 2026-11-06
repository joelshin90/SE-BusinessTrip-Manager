# SE Trip Manager v1.7 — Motion / Staff / Year Filters

GitHub Pages + Firebase Realtime Database (`se-trip-manager/v1`) based on previous v1.6.1.

## Changes
1. Trip Flight Map shows only the **currently moving** flight/ground segment, progressively extended as the animated marker travels. Finished paths are cleared rather than accumulating.
2. Names are shown alongside moving airplane/car icons, grouped at Chinese on-site regions and at each employee's configured home location (including Korea staff who are not travelling). Employees with no configured home location are not assigned an invented location.
3. Playback speed combo and controls use a shared 40px height and aligned field labels.
4. Year quick-select (Jan 1–Dec 31) added to schedule range search, trip flight map range search, and calendar; dashboard and holiday manager already had a year selector.
5. Trips whose end date precedes today are saved as `완료` automatically except cancelled trips (including edits).
6. Changing the trip start date constrains the end date, moves it forward when needed, and attempts to open the end-date picker (browser support varies).

## Deployment
Upload `index.html` and `trip-flight-map.js` to the **repository root** and commit together. Do not upload temporary test artifacts. Refresh the GitHub Pages deployment (Ctrl+Shift+R).

## Data and limitations
- Existing Firebase data path and authentication remain unchanged. Back up using the app JSON export before updating.
- The animation depicts **scheduled** transitions and does not represent actual GPS positions, live flights, or proven attendance.
- Movements are simulated on trip start/end days, and base location comes from each employee's configured home. If a employee has no city configured, their location cannot be plotted.
- External MapLibre/tiles may be blocked on corporate networks; the built-in schematic map remains available.
- JavaScript syntax checked with Node. Full production GitHub Pages/Firebase integration was not tested in this environment.
