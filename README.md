# EspoCRM MCP Server

Ein lokaler, ausschließlich lesender MCP-Server für EspoCRM. Version 0.2 stellt fünfzehn eng begrenzte Werkzeuge für Accounts, Contacts und Opportunities bereit. Es gibt keinen generischen API-Zugriff und keine Schreib- oder Löschfunktion.

> **Status:** Frühe Version `0.2.0`. Vor einem produktiven Einsatz sollten Berechtigungen, Felder und Filter gegen die eigene EspoCRM-Installation geprüft werden.

Dieses Repository ist ein inoffizielles Community-Projekt. Es ist weder mit EspoCRM noch mit Anthropic oder Claude verbunden und wird von diesen Unternehmen nicht unterstützt oder geprüft.

## Funktionen

- Accounts suchen, einzeln lesen sowie Kontakte und Opportunities eines Accounts auflisten
- Contacts suchen, einzeln lesen sowie Accounts und Opportunities eines Kontakts auflisten
- Opportunities suchen, einzeln lesen sowie Account und Kontakte einer Opportunity laden
- normalisierten Activity Stream von Accounts, Contacts und Opportunities lesen
- explizite Feld-, Filter-, Sortier- und Beziehungs-Allowlist
- höchstens 20 Ergebnisse pro Anfrage
- lokales Audit-Log ohne CRM-Inhalte oder Zugangsdaten

Activity-Stream-Antworten enthalten freigegebene Posts, E-Mail-Betreffzeilen und Ereignismetadaten. Anhänge, Reaktionen, rohe EspoCRM-`data`-Objekte sowie alte und neue Werte aus Feldänderungen werden nicht ausgegeben. Post-Texte sind auf 4.000 Zeichen begrenzt.

## Voraussetzungen

- Node.js 22 oder neuer
- EspoCRM mit HTTPS und REST API
- separater EspoCRM-API-Benutzer mit reinen Leserechten auf Account, Contact und Opportunity

## Installation

```bash
npm install
npm run check
npm test
npm run build
```

Kopiere `.env.example` nach `.env` und trage URL und API-Key ein. Die `.env`-Datei ist von Git ausgeschlossen.

```env
ESPOCRM_URL=https://crm.example.de
ESPOCRM_API_KEY=dein-api-key
```

Der Server ergänzt `/api/v1` automatisch. Die Feldfreigaben stehen in `config/permissions.example.yaml`.
Die `.env` und relative Konfigurationspfade werden immer vom Projektordner aus aufgelöst. Der MCP-Client muss deshalb keine Zugangsdaten in seiner eigenen Konfiguration speichern.

### Installationsspezifische Felder

Die Beispiel-Allowlist und die Suchwerkzeuge enthalten die benutzerdefinierten Felder `cEnrichment`, `cRolle` und `cSektor`. Diese Felder gehören nicht zum allgemeinen EspoCRM-Standardschema. Andere Installationen müssen sie in `config/permissions.example.yaml` und den entsprechenden Filtern in `src/server.ts` anpassen oder entfernen.

## Start

```bash
npm start
```

Für einen MCP-Client wird der gebaute Server über Standard-Ein-/Ausgabe gestartet. Beispielkonfiguration:

```json
{
  "mcpServers": {
    "espocrm": {
      "command": "node",
      "args": ["/ABSOLUTER/PFAD/espocrm-mcp-server/dist/index.js"]
    }
  }
}
```

Der Server lädt `.env` automatisch aus seinem Projektordner. Alternativ können die Variablen durch den MCP-Client oder die Prozessumgebung gesetzt werden.

## Entwicklung

```bash
npm run dev
npm run test:watch
```

Siehe [SECURITY.md](SECURITY.md) für das Berechtigungs- und Datenschutzmodell.

## Lizenz

Veröffentlicht unter der [MIT-Lizenz](LICENSE).
