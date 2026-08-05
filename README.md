# EspoCRM MCP Server

Ein lokaler, ausschließlich lesender MCP-Server für EspoCRM. Version 0.1 stellt zwölf eng begrenzte Werkzeuge für Accounts, Contacts und Opportunities bereit. Es gibt keinen generischen API-Zugriff und keine Schreib- oder Löschfunktion.

## Funktionen

- Accounts suchen, einzeln lesen sowie Kontakte und Opportunities eines Accounts auflisten
- Contacts suchen, einzeln lesen sowie Accounts und Opportunities eines Kontakts auflisten
- Opportunities suchen, einzeln lesen sowie Account und Kontakte einer Opportunity laden
- explizite Feld-, Filter-, Sortier- und Beziehungs-Allowlist
- höchstens 20 Ergebnisse pro Anfrage
- lokales Audit-Log ohne CRM-Inhalte oder Zugangsdaten

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
      "args": ["/ABSOLUTER/PFAD/espocrm-mcp-server/dist/index.js"],
      "env": {
        "ESPOCRM_URL": "https://crm.example.de",
        "ESPOCRM_API_KEY": "DEIN_API_KEY",
        "ESPOCRM_PERMISSIONS_FILE": "/ABSOLUTER/PFAD/espocrm-mcp-server/config/permissions.example.yaml",
        "ESPOCRM_AUDIT_LOG": "/ABSOLUTER/PFAD/espocrm-mcp-server/logs/audit.jsonl"
      }
    }
  }
}
```

## Entwicklung

```bash
npm run dev
npm run test:watch
```

Siehe [SECURITY.md](SECURITY.md) für das Berechtigungs- und Datenschutzmodell.
