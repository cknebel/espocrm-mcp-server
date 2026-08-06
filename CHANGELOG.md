# Changelog

Alle wesentlichen Änderungen dieses Projekts werden in dieser Datei dokumentiert.

## 0.4.0 – 2026-08-06

### Hinzugefügt

- zwölf MCP-Werkzeuge zum Suchen, Lesen, Anlegen und Aktualisieren von Meetings, Anrufen und Aufgaben
- Teilnehmerunterstützung für Benutzer, Kontakte und Leads bei Meetings und Anrufen
- Unterstützung für ganztägige Meetings sowie Aufgaben mit Datum oder Datum und Uhrzeit
- explizite `writableFields`-Allowlist je Entität
- Audit-Einträge für Create- und Update-Operationen
- Tests für POST/PUT-Aufrufe, Schreibfeldbegrenzung und MCP-Schreibannotationen

### Geändert

- Server- und Paketversion auf 0.4.0 angehoben
- Berechtigungsschema um Meeting, Call und Task erweitert
- README und Sicherheitsdokumentation an die begrenzten Schreibfunktionen angepasst

### Sicherheit

- Schreibzugriff ist ausschließlich für Meeting, Call und Task möglich
- nicht freigegebene Schreibfelder werden vor dem EspoCRM-Aufruf abgewiesen
- DELETE und generischer API-Zugriff bleiben ausgeschlossen
