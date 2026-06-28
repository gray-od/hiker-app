# Plan: GPX Integration + Group Gear Distribution (Rounds 34–36)

## Summary

Three sequential rounds, each building on the previous:
- **R34**: GPX upload → distance, elevation, route weather
- **R35**: Participants + per-person assignment + progress bars
- **R36**: AI balancing — extended `getPackingList` tool with route + participant data

---

## Round 34 — GPX Integration

### Decisions made
- **Only GPX** — no KML, no KMZ. KML is Google Earth format, not hiking. KMZ — user unpacks manually.
- **Library:** `gpxparser` (~8 KB, pre-computed `distance`, `elevation.{pos,neg,max,min}`)
- **Storage:** new JSONB column `gpx_data` on `gear_lists` (migration 00007)
- **Buttons:**
  - «Загрузить GPX» — file picker → parse → save to Supabase
  - «Показать на карте» — `geo:` URI → system picker (no hardcoded apps)
  - «Скачать GPX» — download original file
- **Weather:** client-side `fetch()` to Open-Meteo (public, CORS, no key)
- **No in-app map** — Leaflet/MapLibre are overkill; user has Organic Maps for navigation
- **No sharing/linking** — PDF already covers "share with group"

### DB migration
```sql
-- 00007_gpx.sql
ALTER TABLE gear_lists ADD COLUMN gpx_data JSONB DEFAULT NULL;
-- gpx_data: {
--   track_name: string,
--   distance_km: number,
--   elevation_gain_m: number,
--   elevation_loss_m: number,
--   max_elevation_m: number,
--   points: [[lat, lng, ele], ...],
--   raw_file_base64: string  -- for "скачать GPX" button
-- }
```

### Files to modify
| File | What |
|---|---|
| `supabase/migrations/00007_gpx.sql` | NEW — migration |
| `src/lib/types.ts` | Add `gpx_data?` to `GearList` |
| `src/app/lists/[id]/page.tsx` | GPX upload button, stats block, download/show buttons |
| `src/lib/chat-system-prompt.ts` | Add route info to `getPackingList` description |
| `src/app/api/chat/route.ts` | Extend `getPackingList` tool to include `gpx_data` + route weather |
| `src/i18n/messages/{uk,ru,en}.json` | New keys: gpx_upload, gpx_distance, gpx_elevation, gpx_show_on_map, gpx_download |
| `package.json` | Add `gpxparser` |

### UI placement (lists/[id]/page.tsx)
```
Без GPX:
📍 12.07.2026    ☀️ Лето           [📎 Загрузить GPX]

С GPX:
📍 12.07.2026    ☀️ Лето    📏 42 км    ⛰ +2800 м
🌡 +12°C на перевале, дощ у вівторок
                    [📍 Показати на карті]  [📥 Скачати GPX]
```

### GPX → AI flow
`getPackingList` tool returns:
```json
{
  "name": "Карпати липень",
  "season": "summer",
  "trip_date": "2026-07-12",
  "items": [...],
  "route": {
    "track_name": "Говерла",
    "distance_km": 42,
    "elevation_gain_m": 2800,
    "elevation_loss_m": 2600,
    "max_elevation_m": 2061,
    "weather": "+12°C, rain Tuesday"
  }
}
```

### Technical notes
- `gpxparser` works in browser: `new GPXParser()` + `parser.parse(gpxText)`
- File input accept: `.gpx`, no size limit (GPX < 1MB normally)
- Raw file stored as base64 in `gpx_data.raw_file_base64` for download button
- Weather: geocode from first track coordinate, Open-Meteo forecast API
- `geo:` URI takes first track coordinate: `geo:lat,lng`

---

## Round 35 — Participants + Assignment

### Decisions made
- **No toggle switch** — data-driven: `participants.length > 0` activates group UI
- **Participants** = text names + optional weight. No accounts, no invites.
- **assigned_to** = one name per row. Simple text field.
- **One row = one bearer.** If quantity > 1 and assigned, user adds multiple rows.
- **Progress bars** per person: `assigned_weight / (body_weight * 0.20)`
- **Weight optional** — defaults to 80 kg with note "приблизительно"
- **Rejected:** full participant system, accounts, invites, real-time sync, role system

### DB migration
```sql
-- 00008_participants.sql
ALTER TABLE gear_lists ADD COLUMN participants JSONB DEFAULT '[]';
-- participants: [{ "name": "Дима", "weight_kg": 80 }, { "name": "Катя", "weight_kg": 55 }]

ALTER TABLE list_items ADD COLUMN assigned_to TEXT DEFAULT '';
-- assigned_to: "Дима" or "Олег" or "" (unassigned)
```

### Files to modify
| File | What |
|---|---|
| `supabase/migrations/00008_participants.sql` | NEW — migration |
| `src/lib/types.ts` | Add `participants` to `GearList`, `assigned_to` to `ListItem` |
| `src/app/lists/[id]/page.tsx` | Participant UI: chips, add modal, assignment dropdown in item rows, per-person weight bars |
| `src/i18n/messages/{uk,ru,en}.json` | New keys |

### UI layout
```
Список «Карпаты июль»
📍 12.07.2026  ☀️ Лето  📏 42 км  ⛰ +2800 м

Участники: [Дима 80 кг ×] [Олег ×] [Катя 55 кг ×]  [+ Добавить]

Снаряжение:
☐ Палатка 2-местная ×1  2300 г  [Дима    ▾]
☐ Горелка ×1             350 г  [Олег    ▾]
☐ Спальник ×1            800 г  [Дима    ▾]
☐ Спальник ×1            800 г  [Олег    ▾]
☐ Спальник ×1            800 г  [Катя    ▾]
☐ Газ 230г ×3            690 г  [—       ▾]

───────────
Дима:  14.2 кг  ████████████████████████░░░░░  89% (80 кг × 20% = 16 кг)
Олег:  12.8 кг  ███████████████████████░░░░░░  61% (80 кг × 20% = 16 кг)
Катя:   9.5 кг  ████████████████████░░░░░░░░░░  86% (55 кг × 20% = 11 кг)
───────────
```

### Participant add modal
```
+ Добавить участника
  Имя: [________]          (обязательно)
  Вес: [__] кг             (необязательно, по умолчанию 80)
  [Отмена]  [Добавить]
```

### Technical notes
- Participant chips show weight if set, else just name
- Chip `×` removes participant and clears their assignments
- Assignment dropdown: list of participant names + "—" (unassigned)
- Per-person totals computed client-side from `listItems.filter(li => li.assigned_to === name)`
- Formula: `progress = assigned_weight_g / (weight_kg * 1000 * 0.20) * 100`
- If no GPX: default recommended weight 25% of body weight
- If GPX loaded: recommended weight 20% of body weight (stricter for known route)

---

## Round 36 — AI Balancing

### What AI gets
Extended `getPackingList` tool response:
```json
{
  "name": "Карпати липень",
  "season": "summer",
  "items": [
    {"name": "Палатка 2-местная", "weight_g": 2300, "quantity": 1, "assigned_to": "Дима"},
    ...
  ],
  "participants": [
    {"name": "Дима", "weight_kg": 80, "assigned_weight_g": 14200},
    {"name": "Олег", "weight_kg": 80, "assigned_weight_g": 12800},
    {"name": "Катя", "weight_kg": 55, "assigned_weight_g": 9500}
  ],
  "route": {
    "distance_km": 42,
    "elevation_gain_m": 2800,
    "weather": "+12°C, rain Tuesday"
  }
}
```

### System prompt addition
```
When a packing list has participants AND route data:
- Calculate recommended max weight per person: 20% of body_weight_kg for routes with elevation > 1000m
- Point out imbalances: "Дима carries 89% of max, Олег carries 61%"
- Suggest redistribution: which items to move from whom to whom
- Consider meal plan assignments (if getMealPlanDetails also called)
- Mention weather-appropriate gear: "Tuesday rain — ensure rain covers for all"
```

### Technical notes
- No new tool needed — just extend existing `getPackingList`
- No server-side changes except expanding the tool's response
- System prompt update in `src/lib/chat-system-prompt.ts`
- AI only suggests — user manually reassigns in UI

---

## Key Design Principles (all rounds)

1. **Data-driven, not toggle-driven** — participants empty = solo, participants non-empty = group
2. **No accounts for participants** — text names only
3. **Simple, not smart** — one row = one bearer, no auto-splitting
4. **AI suggests, human decides** — AI never auto-assigns
5. **No in-app maps** — user has dedicated apps for that
6. **GPX only** — one format, one parser, zero complexity

---

## Rejected Features (documented to avoid revisiting)

| Idea | Reason rejected |
|---|---|
| KML/KMZ support | KML = Google Earth, not hiking; KMZ = user unpacks manually |
| In-app map (Leaflet/MapLibre) | Duplicates Organic Maps / Google Maps; overkill |
| Hardcoded "Open in Google Maps / Organic Maps" buttons | `geo:` URI → system picker is universal |
| "Group hike" toggle switch | Data-driven: participants array determines mode |
| Participant accounts/invites | Adds complexity, low ROI for 3–8 person groups |
| Full participant profiles (age, gender, experience) | Weight of body is the only strong predictor |
| Auto-splitting multi-quantity items | One row = one bearer, user controls granularity |
| Real-time sync between participants | Each person plans individually or leader plans for all |
| Sharing GPX/route via link | PDF already covers sharing |
