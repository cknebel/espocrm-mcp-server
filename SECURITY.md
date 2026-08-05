# Sicherheit

## Sicherheitsmodell

Der Server ist eine zusätzliche Schutzschicht und kein Ersatz für EspoCRM-Rollen. Der verwendete API-Benutzer muss ausschließlich Leserechte für Account, Contact und Opportunity erhalten.

- keine POST-, PUT-, PATCH- oder DELETE-Aufrufe
- keine frei wählbaren Entitäten, Endpunkte oder Beziehungen
- keine frei wählbaren Rückgabefelder
- keine Expressions oder Subqueries
- höchstens 20 Ergebnisse und 10 Filter pro Anfrage
- HTTPS ist außerhalb von localhost verpflichtend
- HTTP-Fehlertexte des CRM werden nicht an den MCP-Client weitergegeben

## Nicht freigegebene Daten

Insbesondere `description`, mehrwertige `emailAddressData`/`phoneNumberData`, Portalbenutzer, Original-E-Mails, Zielgruppenlisten und technische Auditfelder werden nicht zurückgegeben.

## Audit-Log

Das JSONL-Audit-Log enthält Zeitpunkt, Werkzeug, Entität, optionale Datensatz-ID, Operation, Erfolg und Ergebnisanzahl. API-Keys, Suchtexte, Filterwerte und CRM-Datensätze werden nicht protokolliert.

## Zugangsdaten

- niemals API-Keys committen
- `.env` ist in `.gitignore` enthalten
- für produktive Nutzung Schlüssel bevorzugt über die lokale MCP-Client-Konfiguration bereitstellen
- API-Key regelmäßig rotieren und bei Verdacht sofort widerrufen

Sicherheitsprobleme sollten privat an den Repository-Eigentümer gemeldet und nicht als öffentliches Issue mit CRM-Daten veröffentlicht werden.
