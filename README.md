# Boulder Challenges 🧗

Eine installierbare **PWA**, mit der ihr beim Bouldern in der Gruppe Challenges tracken könnt:
Wer hat einen Boulder **geflasht**, **getoppt** oder **nicht geschafft**? Mit einstellbarem
Punktesystem und **Live-Leaderboard** – jede:r am eigenen Handy, in Echtzeit.

## Funktionen

- **Echtzeit-Multiplayer:** Eine Person erstellt eine Challenge, andere treten per Code/Link bei.
- **Kein Login:** Beitritt nur mit Anzeigename (jedes Gerät bekommt anonym eine stabile Identität).
- **Boulder spontan hinzufügen:** fortlaufende Nummer + Schwierigkeit + optional Farbe.
- **Einstellbares Punktesystem** pro Challenge (Flash / Top / Kosten pro Versuch).
- **Live-Leaderboard** und **gerätelokaler Session-Verlauf**.

## Punktesystem ("strikt bezahlen")

Jeder Versuch kostet Punkte – auch der erfolgreiche.

| Ergebnis                  | Formel (Defaults 30 / 25 / 5) | Beispiel         |
| ------------------------- | ----------------------------- | ---------------- |
| Flash (Top im 1. Versuch) | `flash − 1×kosten`            | 30 − 5 = **25**  |
| Top im 2. Versuch         | `top − 2×kosten`              | 25 − 10 = **15** |
| 3× ohne Top               | `0 − 3×kosten`                | **−15**          |

## Tech-Stack

React + Vite + TypeScript · Tailwind CSS · Supabase (Postgres + Realtime + Anonymous Auth) ·
vite-plugin-pwa.

## Einrichtung

### 1. Supabase-Projekt anlegen (kostenlos)

1. Auf [supabase.com](https://supabase.com) ein kostenloses Projekt erstellen.
   **Region:** Frankfurt/EU empfohlen.
2. **Authentication → Providers → Anonymous Sign-ins** aktivieren.
3. **SQL Editor** öffnen, den Inhalt von [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   einfügen und ausführen.
4. **Project Settings → API**: `Project URL` und den `anon`-`public`-Key kopieren.

### 2. Lokale Konfiguration

```bash
cp .env.example .env
# In .env die beiden Werte aus Schritt 1.4 eintragen:
#   VITE_SUPABASE_URL=...
#   VITE_SUPABASE_ANON_KEY=...
```

### 3. Installieren & starten

```bash
npm install
npm run dev      # Entwicklungsserver
npm run test     # Unit-Tests (Punkteberechnung)
npm run build    # Production-Build
npm run preview  # Build lokal testen (inkl. PWA/Service Worker)
```

## Manuelles Testen (Echtzeit)

Am besten mit zwei Browser-Fenstern (eins normal, eins im Inkognito-Modus) oder Handy + Laptop:

1. Fenster A: **Challenge erstellen**, Code/Link teilen.
2. Fenster B: per Code **beitreten**.
3. Fenster A: **Boulder hinzufügen** → erscheint live in Fenster B.
4. Beide tragen Ergebnisse ein → **Leaderboard** aktualisiert sich live in beiden.

## Deployment

Statisches Frontend, deploybar z.B. auf **Vercel** oder **Netlify** (beide kostenlos).
Die beiden `VITE_SUPABASE_*`-Variablen dort als Environment-Variablen hinterlegen.
Wichtig: Als SPA müssen alle Routen auf `index.html` zeigen (Vercel/Netlify erkennen Vite
i.d.R. automatisch; sonst Rewrite `/* → /index.html` setzen).

## Projektstruktur

```
src/
  lib/        supabase-Client, Scoring, API-Queries, Codes, Verlauf
  hooks/      useAuth (anon. Login), useRealtimeSession (Live-Daten)
  routes/     Home, CreateSession, JoinSession, SessionView
  components/ Leaderboard, BoulderCard, ResultEditor, AddBoulderDialog, ShareSession
supabase/
  migrations/ 0001_init.sql  (Schema, Trigger, RLS, Realtime)
```
