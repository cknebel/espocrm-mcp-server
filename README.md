# EspoCRM MCP Server für Claude Desktop und ChatGPT

Ein **lokal ausgeführter und ausschließlich lesender MCP-Server für Claude Desktop und ChatGPT**. Claude Desktop kann den Node.js-Prozess direkt über Standard-Ein-/Ausgabe (`stdio`) starten. ChatGPT erreicht denselben lokalen `stdio`-Server optional über den offiziellen OpenAI Secure MCP Tunnel. Der MCP-Server selbst öffnet in beiden Varianten keinen öffentlichen Port und benötigt kein externes Hosting.

Version 0.3 stellt Claude und ChatGPT sechzehn eng begrenzte Werkzeuge für EspoCRM Accounts, Contacts, Opportunities und verknüpfte E-Mails bereit. Es gibt keinen generischen API-Zugriff und keine Schreib- oder Löschfunktion.

> **Status:** Frühe Version `0.3.0`. Vor einem produktiven Einsatz sollten Berechtigungen, Felder und Filter gegen die eigene EspoCRM-Installation geprüft werden.

Dieses Repository ist ein inoffizielles Community-Projekt. Es ist weder mit EspoCRM noch mit Anthropic, Claude oder OpenAI verbunden und wird von diesen Unternehmen nicht unterstützt oder geprüft.

## Wie die lokale Integration funktioniert

1. Das Repository, die Konfiguration und der EspoCRM-API-Key liegen lokal auf dem Rechner.
2. Beim Start von Claude Desktop wird `dist/index.js` als lokaler Unterprozess gestartet.
3. Claude ruft ausschließlich die fest definierten MCP-Werkzeuge über `stdio` auf.
4. Der lokale Prozess sendet die erlaubten HTTPS-GET-Anfragen an EspoCRM und filtert die Antworten über seine Allowlists.
5. Nur die gefilterten Werkzeugergebnisse werden an Claude zurückgegeben. Beim vollständigen Beenden von Claude Desktop wird auch der lokale MCP-Prozess beendet.

„Lokal“ bezieht sich auf die Ausführung und Speicherung des MCP-Servers und seiner EspoCRM-Zugangsdaten. Abgerufene CRM-Inhalte werden zur Verarbeitung an den jeweils verwendeten KI-Dienst übertragen und unterliegen den Daten- und Datenschutzeinstellungen des Anthropic- beziehungsweise OpenAI-Kontos.

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

- Node.js 22 oder neuer
- EspoCRM mit HTTPS und REST API
- separater EspoCRM-API-Benutzer mit reinen Leserechten auf Account, Contact, Opportunity und Email
- für Claude: Claude Desktop für macOS oder Windows
- für ChatGPT: ein ChatGPT-Workspace mit freigeschaltetem Entwicklermodus und Zugriff auf Secure MCP Tunnel

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

## ChatGPT über Secure MCP Tunnel konfigurieren

ChatGPT kann einen lokalen `stdio`-Server nicht direkt starten. Der offizielle [OpenAI Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels) stellt deshalb eine verschlüsselte, ausschließlich ausgehende HTTPS-Verbindung von dem lokalen Rechner zu OpenAI her. Es wird kein eingehender Port geöffnet und der EspoCRM-API-Key bleibt in der lokalen `.env`.

Die Tunnel-Funktion und der ChatGPT-Entwicklermodus sind separate Berechtigungen und können je nach Tarif beziehungsweise Workspace-Richtlinie nicht verfügbar sein. Die Tunnel-Variante eignet sich für eine private Entwickler-App im eigenen Workspace; sie ist kein öffentlicher Plugin-Endpunkt.

### 1. Tunnel und Laufzeitschlüssel anlegen

1. In den [Platform-Tunnel-Einstellungen](https://platform.openai.com/settings/organization/tunnels) einen Tunnel anlegen.
2. Dem Tunnel die zuständige OpenAI-Organisation und den ChatGPT-Workspace zuordnen.
3. Unter [Platform API Keys](https://platform.openai.com/settings/organization/api-keys) einen separaten Laufzeitschlüssel erstellen.
4. Den Schlüssel auf **Restricted** setzen und ausschließlich **Tunnels: Read + Use** freigeben. **Tunnels: Manage** wird nur zum Anlegen oder Ändern eines Tunnels benötigt und gehört nicht in den langfristig laufenden Client.

Tunnel-ID und Laufzeitschlüssel dürfen nicht in das Repository eingecheckt werden. Unter macOS oder Linux kann der Schlüssel beispielsweise außerhalb des Projekts in einer nur für den eigenen Benutzer lesbaren Datei liegen. Die verdeckte Eingabe verhindert, dass der Schlüssel in der Shell-History erscheint:

```bash
install -d -m 700 "$HOME/.config/openai/tunnel-client"
read -s tunnel_runtime_key
printf '%s\n' "$tunnel_runtime_key" \
  > "$HOME/.config/openai/tunnel-client/espocrm-local.key"
chmod 600 "$HOME/.config/openai/tunnel-client/espocrm-local.key"
unset tunnel_runtime_key
```

### 2. `tunnel-client` installieren

Lade die aktuelle, zum Betriebssystem und zur Prozessorarchitektur passende Version aus den offiziellen [`openai/tunnel-client`-Releases](https://github.com/openai/tunnel-client/releases/latest). Prüfe vor der Installation die SHA-256-Prüfsumme aus `SHA256SUMS.txt` und stelle sicher, dass `tunnel-client` anschließend über `PATH` erreichbar ist:

```bash
tunnel-client --version
tunnel-client help quickstart
```

### 3. Lokales Tunnel-Profil erstellen

Ermittle zunächst den absoluten Node.js-Pfad mit `command -v node`. Ersetze anschließend Tunnel-ID, Node.js-Pfad und Projektpfad im folgenden Beispiel:

```bash
tunnel-client init \
  --sample sample_mcp_stdio_local \
  --profile espocrm-local \
  --tunnel-id tunnel_... \
  --mcp-command "/ABSOLUTER/PFAD/ZU/node /ABSOLUTER/PFAD/ZUM/espocrm-mcp-server/dist/index.js" \
  --control-plane-api-key-ref "file:$HOME/.config/openai/tunnel-client/espocrm-local.key"
```

Der Befehl speichert nur den Verweis auf die Schlüsseldatei. Die EspoCRM-Konfiguration wird weiterhin automatisch aus der lokalen `.env` im Projektordner geladen.

Prüfe das Profil, bevor der Tunnel gestartet wird:

```bash
tunnel-client doctor --profile espocrm-local --explain
```

### 4. Tunnel starten und Status prüfen

Für einen lokal verwalteten Hintergrundprozess:

```bash
tunnel-client runtimes connect \
  --alias espocrm-local \
  --profile espocrm-local \
  --tunnel-id tunnel_... \
  --runtime-api-key "file:$HOME/.config/openai/tunnel-client/espocrm-local.key" \
  --mcp-command "/ABSOLUTER/PFAD/ZU/node /ABSOLUTER/PFAD/ZUM/espocrm-mcp-server/dist/index.js"

tunnel-client runtimes status espocrm-local --json
```

Der Status muss `process_running: true`, `healthy: true` und `ready: true` melden. Nach einem Neustart des Rechners muss der lokale Prozess gegebenenfalls erneut gestartet werden:

```bash
tunnel-client runtimes connect --alias espocrm-local
```

Ohne laufenden Tunnel bleibt die App in ChatGPT sichtbar, Werkzeugaufrufe schlagen jedoch fehl. Beenden lässt sich der verwaltete Prozess mit:

```bash
tunnel-client runtimes stop espocrm-local
```

### 5. Entwickler-App in ChatGPT verbinden

1. In ChatGPT unter **Settings → Security and login** den **Developer mode** aktivieren. Diese Einstellung erlaubt generell nicht verifizierte Entwickler-Apps und sollte bewusst verwendet werden.
2. [ChatGPT Plugins](https://chatgpt.com/plugins) öffnen und **Create app** beziehungsweise **App erstellen** wählen.
3. Einen Namen und eine Beschreibung eintragen.
4. Unter **Connection** die Option **Tunnel** und anschließend den zuvor angelegten Tunnel wählen.
5. Unter **Authentication** die Option **None** beziehungsweise **Keine Authentifizierung** wählen. Der Tunnel-Laufzeitschlüssel authentifiziert den lokalen Tunnel-Client bereits separat; der EspoCRM-API-Key bleibt ausschließlich auf dem Rechner.
6. Den Sicherheitshinweis bestätigen und die App erstellen.
7. Vor dem Verbinden kontrollieren, dass genau die erwarteten sechzehn Werkzeuge erkannt und alle als **Read/Lesen** gekennzeichnet werden.
8. Die App mit dem Workspace verbinden.

Ein erster Test in einem neuen Chat kann lauten:

> Nutze EspoCRM und suche maximal drei Accounts. Nenne nur ihre Namen.

Für Activity Stream und E-Mail-Inhalte:

> Zeige die letzten Aktivitäten zu diesem Kontakt und lies auch die darin referenzierten E-Mails.

ChatGPT überträgt nur die Ergebnisse der tatsächlich aufgerufenen Werkzeuge. Diese CRM-Inhalte werden Bestandteil der ChatGPT-Unterhaltung und unterliegen den Daten-, Aufbewahrungs- und Compliance-Einstellungen des verwendeten Workspace.

### Fehlerbehebung in ChatGPT

Wenn die App sichtbar ist, aber keine Daten liefert:

1. `tunnel-client runtimes status espocrm-local --json` ausführen und auf `healthy: true` sowie `ready: true` prüfen.
2. `tunnel-client doctor --profile espocrm-local --explain` ausführen.
3. Prüfen, ob der Tunnel der richtigen Platform-Organisation und dem richtigen ChatGPT-Workspace zugeordnet ist.
4. Prüfen, ob der Laufzeitschlüssel **Tunnels: Read + Use** besitzt.
5. Nach Codeänderungen `npm run check`, `npm test` und `npm run build` ausführen, den Tunnel-Prozess neu starten und die App in ChatGPT über **Update/Aktualisieren** neu einlesen.

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
