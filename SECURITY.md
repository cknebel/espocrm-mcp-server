# Sicherheit

## Unterstützte Versionen

Dieses Projekt befindet sich in einer frühen Entwicklungsphase. Sicherheitskorrekturen werden nur für den aktuellen Stand des Branches `main` und die neueste veröffentlichte Version bereitgestellt.

## Sicherheitsproblem melden

Bitte keine Sicherheitslücken, API-Keys, CRM-Adressen, Protokolle oder CRM-Daten in öffentlichen Issues veröffentlichen.

Verwende stattdessen auf GitHub unter **Security → Advisories** die Funktion **Report a vulnerability** für eine private Meldung. Falls diese Funktion vorübergehend nicht verfügbar ist, erstelle ausschließlich ein öffentliches Issue ohne vertrauliche Details und bitte dort um einen privaten Kontaktweg.

## Sicherheitsmodell

Der Server ist eine zusätzliche Schutzschicht und kein Ersatz für EspoCRM-Rollen. Der verwendete API-Benutzer muss ausschließlich Leserechte für Account, Contact und Opportunity erhalten.

- keine POST-, PUT-, PATCH- oder DELETE-Aufrufe
- keine frei wählbaren Entitäten, Endpunkte oder Beziehungen
- keine frei wählbaren Rückgabefelder
- keine Expressions oder Subqueries
- höchstens 20 Ergebnisse und 10 Filter pro Anfrage
- HTTPS ist außerhalb von localhost verpflichtend
- HTTP-Fehlertexte des CRM werden nicht an den MCP-Client weitergegeben
- Stream-Einträge werden normalisiert; rohe `Note.data`-Objekte, Reaktionen, Anhänge und Änderungswerte werden verworfen
- Stream-Posts werden auf 4.000 Zeichen und Bezeichnungen auf 500 Zeichen begrenzt

## Nicht freigegebene Daten

Insbesondere `description`, mehrwertige `emailAddressData`/`phoneNumberData`, Portalbenutzer, Original-E-Mails, Zielgruppenlisten und technische Auditfelder werden nicht zurückgegeben.

Der Activity Stream kann ausdrücklich vertrauliche Freitexte und E-Mail-Betreffzeilen enthalten. Zugriff darauf setzt die Stream-Berechtigung des separaten EspoCRM-API-Benutzers voraus. Der MCP-Server bietet keine Funktionen zum Öffnen oder Herunterladen von Stream-Anhängen.

## Audit-Log

Das JSONL-Audit-Log enthält Zeitpunkt, Werkzeug, Entität, optionale Datensatz-ID, Operation, Erfolg und Ergebnisanzahl. API-Keys, Suchtexte, Filterwerte und CRM-Datensätze werden nicht protokolliert.

## Zugangsdaten

- niemals API-Keys committen
- `.env` ist in `.gitignore` enthalten
- für produktive Nutzung Schlüssel bevorzugt über die lokale MCP-Client-Konfiguration bereitstellen
- API-Key regelmäßig rotieren und bei Verdacht sofort widerrufen
