# Tischlerei Jell – Website (Vorschau)

Statische Website (HTML, CSS, JavaScript – kein Build-Schritt) für die Tischlerei Jell, Anthering bei Salzburg.
Der Hero ist eine per Scroll gesteuerte Kamerafahrt (Bildsequenz auf `<canvas>`), alle Schriften und Skripte sind lokal eingebunden.

**Vorschau:** https://stelzerweb.at/tischlerei-jell/

Stand: Gestaltungsentwurf, noch nicht vom Betrieb freigegeben; für Suchmaschinen gesperrt (`noindex`).

| Pfad | Inhalt |
|---|---|
| `index.html` | Startseite mit allen Abschnitten |
| `impressum.html`, `datenschutz.html` | Rechtsseiten |
| `assets/` | CSS, JavaScript, Schriften (OFL), Bilder, Logo |
| `frames/` | Bildsequenzen der Kamerafahrt (Desktop / Hochformat) |

Lokal ansehen: `python -m http.server 8123` und http://localhost:8123 öffnen.

Schriften: Fraunces, Instrument Sans, DM Mono (SIL Open Font License 1.1). Smooth Scroll: Lenis (MIT). Lizenztexte liegen in `assets/fonts/` und `assets/js/vendor/`.
