# SE Trip Manager v1.2 — GitHub Pages + Firebase Realtime Database

## Quick test
Open `index.html` in a browser. **Local demo mode** works immediately. In Data Management, create employees; in Trip Schedule create trips and verify Dashboard, Calendar, Reports, Events, Sites and unified KR/CN Holidays. Local demo data remains in the browser's `localStorage`.

## Deploy to GitHub Pages
Upload `index.html` to the repository root; Settings > Pages > Deploy from branch > `main` / `(root)`. The URL will look like `https://YOUR_NAME.github.io/YOUR_REPO/`.

## Firebase setup (required for team-wide sharing)
1. In Firebase Console, create a **separate** project and a **Realtime Database** in an appropriate region. Do not connect to or overwrite the DailyPatchList data.
2. Enable **Authentication > Sign-in method > Email/Password**. Add authorized users under Authentication > Users. Never enable anonymous or public writable access for this personnel schedule.
3. In Realtime Database > Rules, use at least these authenticated-user-only rules (adjust to your organization's authorization policy):

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "se-trip-manager": {
      "v1": {
        ".read": "auth != null",
        ".write": "auth != null",
        ".validate": "newData.hasChildren(['sites', 'people', 'trips', 'reports', 'events', 'holidays', 'workdays']) || !newData.exists()"
      }
    }
  }
}
```

For stricter team access, use a whitelist of Firebase `auth.uid` values instead of granting all authenticated users access. These example rules are not a granular role/permission system. A safer production implementation needs user roles, audit trail, retention and organization security review. 

4. In Firebase Project Settings > General, copy the **Web API Key** from your web app configuration. The API key is a project identifier, not a secret; the **database security rules** provide actual authorization.
5. Open the Trip Manager and go to **데이터 관리**. Enter the Realtime Database URL (e.g. `https://project-default-rtdb.asia-southeast1.firebasedatabase.app`), Web API Key, path `se-trip-manager/v1`, and Firebase email/password. Click **연결 / 로그인**.
6. A successful connection downloads the shared database **without automatically replacing its contents with your local demo data**. If the remote data path is empty and you intend to upload your existing browser's data, click **현재 데이터 최초 업로드**. Back up your JSON first.

## Important behavior and limits
- Firebase connections use REST and authenticated Firebase ID tokens; passwords are not stored. Config URL, API key, and path are saved locally.
- Each edited record is synchronized as an independent update. Remote updates are polled approximately every 15 seconds; this is **near-real-time**, not an event-stream subscription.
- Multiple people editing the **same record simultaneously** can overwrite each other's changes. Authentication tokens expire and require signing in again. No offline queue, fine-grained roles or audit log yet.
- Local demo mode remains useful for preview and GitHub deployment tests; it does **not** sync users.
- Holidays are displayed as unified KR/CN rows, with separate editable date ranges per country.
- Do not enter confidential customer information or personal data into an unapproved public demonstration deployment.

## v1.3 — Regional trip schedule
- Trip form has **region** (BJ, HF, NB, WX, WH, SX) independently of customer Site and equipment.
- Region codes and names are managed at **Site / 호기 → 출장 지역 관리**, persisted under `se-trip-manager/v1/regions`.
- Original trips without `regionId` are preserved and labeled **지역 미지정**. Edit each trip to assign its region; no site-to-region guess is made.
- Schedule shows region code, with Site in tooltip and trip list. Weekend and KR/CN configured holiday columns are pink, today takes precedence in yellow.
- Schedule spans 24 continuously adjacent months centered around the selected reference month. Vertical mouse wheel scrolls the timeline horizontally. Use the month selector / Today shortcut to jump.
- Remote schema stays compatible with v1.2.1. Back up JSON before replacing the deployed page. Changing the source file does not itself change remote Firebase data.
