# EspoCRM MCP Server für Claude Desktop

Ein **lokal ausgeführter und ausschließlich lesender MCP-Server für Claude Desktop**. Claude Desktop startet den Node.js-Prozess auf dem eigenen Rechner und kommuniziert mit ihm über Standard-Ein-/Ausgabe (`stdio`). Der MCP-Server öffnet keinen öffentlichen Port und benötigt kein externes Hosting.

Version 0.3 stellt Claude sechzehn eng begrenzte Werkzeuge für EspoCRM Accounts, Contacts, Opportunities und verknüpfte E-Mails bereit. Es gibt keinen generischen API-Zugriff und keine Schreib- oder Löschfunktion.

> **Status:** Frühe Version `0.3.0`. Vor einem produktiven Einsatz sollten Berechtigungen, Felder und Filter gegen die eigene EspoCRM-Installation geprüft werden.

Dieses Repository ist ein inoffizielles Community-Projekt. Es ist weder mit EspoCRM noch mit Anthropic oder Claude verbunden und wird von diesen Unternehmen nicht unterstützt oder geprüft.

## Wie die lokale Integration funktioniert

1. Das Repository, die Konfiguration und der EspoCRM-API-Key liegen lokal auf dem Rechner.
2. Beim Start von Claude Desktop wird `dist/index.js` als lokaler Unterprozess gestartet.
3. Claude ruft ausschließlich die fest definierten MCP-Werkzeuge über `stdio` auf.
4. Der lokale Prozess sendet die erlaubten HTTPS-GET-Anfragen an EspoCRM und filtert die Antworten über seine Allowlists.
5. Nur die gefilterten Werkzeugergebnisse werden an Claude zurückgegeben. Beim vollständigen Beenden von Claude Desktop wird auch der lokale MCP-Prozess beendet.

„Lokal“ bezieht sich auf die Ausführung und Speicherung des MCP-Servers und seiner Zugangsdaten. CRM-Inhalte, die Claude über ein Werkzeug abruft, werden zur Verarbeitung Bestandteil der Claude-Unterhaltung und unterliegen den Daten- und Datenschutzeinstellungen des verwendeten Anthropic-Kontos.

## Funktionen

- Accounts suchen, einzeln lesen sowie Kontakte und Opportunities eines Accounts auflisten
- Contacts suchen, einzeln lesen sowie Accounts und Opportunities eines Kontakts auflisten
- Opportunities suchen, einzeln lesen sowie Account und Kontakte einer Opportunity laden
- normalisierten Activity Stream von Accounts, Contacts und Opportunities lesen
- einzelne, im Activity Stream referenzierte E-Mails mit Klartextinhalt lesen
- explizite Feld-, Filter-, Sortier- und Beziehungs-Allowlist
- höchstens 20 Ergebnisse pro Anfrage
- lokales Audit-Log ohne CRM-Inhalte oder Zugangsdaten

Activity-Stream-Antworten enthalten freigegebene Posts, E-Mail-Betreffzeilen, `emailId`-Verweise und Ereignismetadaten. Anhänge, Reaktionen, rohe EspoCRM-`data`-Objekte sowie alte und neue Werte aus Feldänderungen werden nicht ausgegeben. Post-Texte sind auf 4.000 Zeichen begrenzt.

Das Werkzeug `get_email` liest eine einzelne E-Mail anhand einer `emailId`. Es bevorzugt `bodyPlain` und wandelt HTML nur dann in Text um, wenn kein Klartext vorhanden ist. Pro Aufruf werden standardmäßig 20.000 und höchstens 30.000 Zeichen ausgegeben; längere Inhalte können mit `bodyOffset` abschnittsweise gelesen werden. Anhangsinhalte, BCC, technische Message-IDs und rohe HTML-Inhalte werden nicht zurückgegeben.

## Voraussetzungen

- Claude Desktop für macOS oder Windows
- Node.js 22 oder neuer
- EspoCRM mit HTTPS und REST API
- separater EspoCRM-API-Benutzer mit reinen Leserechten auf Account, Contact, Opportunity und Email

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

## Claude Desktop konfigurieren

Der Server ist für den lokalen `stdio`-Betrieb mit Claude Desktop vorbereitet. Er wird normalerweise **nicht manuell gestartet**: Claude Desktop startet und beendet ihn anhand seiner Konfigurationsdatei.

### 1. Absolute Pfade ermitteln

Claude Desktop wird als grafische Anwendung gestartet und kann deshalb eine andere `PATH`-Umgebung als das Terminal besitzen. Verwende für Node.js und `dist/index.js` möglichst absolute Pfade.

Auf macOS zeigt dieser Befehl den Node.js-Pfad:

```bash
command -v node
```

Der Projektpfad muss auf die bereits gebaute Datei `dist/index.js` zeigen.

### 2. Claude-Konfiguration öffnen

Öffne in Claude Desktop **Settings → Developer → Edit Config**. Die Konfigurationsdatei liegt normalerweise hier:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Wenn bereits andere MCP-Server eingetragen sind, ergänze den vorhandenen Inhalt innerhalb von `mcpServers`, anstatt die übrigen Einträge zu überschreiben.

### 3. MCP-Server eintragen

Beispiel für macOS:

```json
{
  "mcpServers": {
    "espocrm": {
      "command": "/opt/homebrew/bin/node",
      "args": [
        "/Users/DEINNAME/git/espocrm-mcp-server/dist/index.js"
      ]
    }
  }
}
```

Passe beide Pfade an die eigene Installation an. Auf Intel-Macs kann Node.js beispielsweise unter `/usr/local/bin/node` liegen.

Beispiel für Windows:

```json
{
  "mcpServers": {
    "espocrm": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": [
        "C:\\Users\\DEINNAME\\git\\espocrm-mcp-server\\dist\\index.js"
      ]
    }
  }
}
```

Der Server lädt `.env` automatisch aus seinem Projektordner. Der API-Key muss daher nicht in `claude_desktop_config.json` eingetragen werden.

### 4. Claude Desktop vollständig neu starten

Speichere die JSON-Datei und beende Claude Desktop vollständig:

- macOS: **Cmd+Q** oder **Claude → Quit Claude**
- Windows: Claude über das Symbol im Infobereich mit **Quit/Exit** schließen

Öffne Claude Desktop anschließend erneut. Ein bloßes Schließen des Fensters reicht möglicherweise nicht aus, weil die Anwendung und der MCP-Prozess im Hintergrund weiterlaufen können.

### 5. Verbindung testen

Öffne in einem neuen Chat das Menü für Tools beziehungsweise Connectors. Dort sollten die EspoCRM-Werkzeuge erscheinen. Ein einfacher Test ist:

> Suche maximal drei Accounts in EspoCRM und nenne nur ihre Namen.

Für den Activity Stream und E-Mail-Inhalte beispielsweise:

> Zeige die letzten Aktivitäten zu diesem Kontakt und lies auch die darin referenzierten E-Mails.

Claude entscheidet anhand der Werkzeugbeschreibungen, welche Aufrufe erforderlich sind. Jeder Aufruf bleibt durch die Allowlist und die EspoCRM-Rechte des API-Benutzers begrenzt.

## Aktualisieren

Nach einem Update des Repositories müssen Abhängigkeiten und Build aktualisiert werden:

```bash
git pull
npm install
npm run check
npm test
npm run build
```

Danach Claude Desktop vollständig beenden und neu starten, damit der neu gebaute Serverprozess geladen wird.

## Fehlerbehebung in Claude Desktop

Wenn die EspoCRM-Werkzeuge nicht erscheinen:

1. JSON-Syntax der `claude_desktop_config.json` prüfen.
2. Sicherstellen, dass `command` und `args` absolute, vorhandene Pfade enthalten.
3. Prüfen, ob `.env` im Projektordner liegt und URL sowie API-Key gesetzt sind.
4. Im Projekt `npm run check`, `npm test` und `npm run build` ausführen.
5. Claude Desktop vollständig beenden und erneut öffnen.

Claude-Desktop-Protokolle liegen normalerweise hier:

- macOS: `~/Library/Logs/Claude`
- Windows: `%APPDATA%\Claude\logs`

Besonders hilfreich sind `mcp.log` und Dateien nach dem Muster `mcp-server-espocrm.log`. Die allgemeine Anleitung für lokale MCP-Server und aktuelle Claude-Desktop-Oberflächen steht in der [offiziellen MCP-Dokumentation](https://modelcontextprotocol.io/docs/develop/connect-local-servers). Anthropic beschreibt alternativ installierbare Desktop Extensions in seiner [Claude-Desktop-Hilfe](https://support.anthropic.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop); dieses Repository verwendet derzeit weiterhin die direkte lokale JSON-Konfiguration.

## Entwicklung

```bash
npm run dev
npm run test:watch
```

Siehe [SECURITY.md](SECURITY.md) für das Berechtigungs- und Datenschutzmodell.

## Lizenz

Veröffentlicht unter der [MIT-Lizenz](LICENSE).
