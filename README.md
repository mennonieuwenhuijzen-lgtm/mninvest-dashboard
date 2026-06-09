# MNinvest dashboard - live site

Dit is de **publieke** dashboard-site (geen euro-bedragen, geen privé-data). Hij wordt op
Vercel gehost en dagelijks automatisch ververst via GitHub Actions.

- Live: https://mninvest-dashboard.vercel.app
- `index.html` - schil met hamburger-menu + live koers-tickerbalk bovenin
- `dashboard.html` - actueel markt-vs-analisten-dashboard (analyse, met de hand)
- `uitleg.html` - handleiding (theorie + 18 criteria)
- `week-2026-Wxx.html` - nieuwspagina per week
- `live.json` - verse koersen voor de tickerbalk (door de Action ververst)
- `positions.json` + `refresh_live.py` - de dagelijkse koers-motor
- `.github/workflows/daily-refresh.yml` - draait elke dag in de cloud

## Hoe de splitsing werkt

- **Dagelijkse feiten** (koersen, dagmutatie): automatisch, via `live.json`. Raakt nooit de
  geschreven analyse aan.
- **Analyse** (de markt-vs-analisten-verhalen in `dashboard.html`): met de hand, met oordeel,
  wanneer er iets wezenlijks verandert. Koersruis is geen reden om de thesis te herschrijven.
- **Weekpagina**: wekelijks als concept via een pull request, jij keurt goed (merge = live).

## Eenmalige setup (zie ook de stappen die Claude in de chat gaf)

1. Maak op GitHub een repo `mninvest-dashboard` (mag private blijven).
2. Upload de inhoud van deze map (`archief/`) naar de repo.
3. Koppel de repo aan het bestaande Vercel-project (Vercel > Project > Settings > Git).
   Framework Preset: **Other**, geen build-command, output = root.
4. Open in GitHub het tabblad **Actions** en draai "Dagelijkse koers-refresh" eenmaal
   handmatig (knop *Run workflow*) om te testen.

## Dagelijks (automatisch)

`daily-refresh.yml` draait 22:30 UTC: haalt koersen, schrijft `live.json`, commit + push.
Vercel zet de nieuwe `live.json` automatisch live. Laptop mag uit.

Handmatig verversen kan altijd: GitHub > Actions > Run workflow.

## Lokaal testen

```
python refresh_live.py      # schrijft live.json met verse koersen
```
