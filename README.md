# EspoCRM MCP Server für Claude Desktop und ChatGPT

Ein allowlist-basierter MCP-Server für EspoCRM. Er stellt Claude und ChatGPT eng begrenzte Werkzeuge für Accounts, Contacts, Opportunities, verknüpfte E-Mails sowie Meetings, Anrufe und Aufgaben bereit. Meetings, Anrufe und Aufgaben können gesucht, gelesen, angelegt und aktualisiert werden. Es gibt keinen generischen API-Zugriff und keine Löschfunktion.

Der Server kann auf zwei Arten betrieben werden:

| Betriebsart | Transport | Typischer Einsatz |
| --- | --- | --- |
| Lokal auf dem eigenen Rechner | `stdio` | Claude Desktop direkt; ChatGPT über OpenAI Secure MCP Tunnel |
| Auf einem Server mit Docker und Caddy | Streamable HTTP hinter HTTPS-Reverse-Proxy | ChatGPT und Claude als Remote-MCP-Endpunkt mit Bearer Token |

> **Status:** Frühe Version `0.4.0`. Vor einem produktiven Einsatz sollten Berechtigungen, Felder, Statuswerte und Filter gegen die eigene EspoCRM-Installation geprüft werden.

Dieses Repository ist ein inoffizielles Community-Projekt. Es ist weder mit EspoCRM noch mit Anthropic, Claude oder OpenAI verbunden und wird von diesen Unternehmen nicht unterstützt oder geprüft.

## Welche Betriebsart passt?

**Lokal** ist die beste Wahl, wenn der MCP-Server und der EspoCRM-API-Key nur auf deinem Rechner liegen sollen. Claude Desktop startet den Server direkt als lokalen Unterprozess. ChatGPT kann denselben lokalen `stdio`-Server nicht direkt starten, erreicht ihn aber über den offiziellen OpenAI Secure MCP Tunnel.

**Serverbetrieb** ist die bessere Wahl, wenn Claude und ChatGPT denselben dauerhaft laufenden Remote-MCP-Endpunkt nutzen sollen. Der Node-Prozess läuft dabei in Docker nur intern erreichbar. Caddy übernimmt HTTPS, den öffentlichen Hostnamen und die Bearer-Token-Prüfung.

In beiden Varianten gilt: Die CRM-Inhalte, die über ein MCP-Werkzeug abgerufen werden, werden an den jeweils verwendeten KI-Dienst übertragen und unterliegen den Daten- und Datenschutzeinstellungen des Anthropic- beziehungsweise OpenAI-Kontos.

## Funktionen

- Accounts suchen, einzeln lesen sowie Kontakte und Opportunities eines Accounts auflisten
- Contacts suchen, einzeln lesen sowie Accounts und Opportunities eines Kontakts auflisten
- Opportunities suchen, einzeln lesen sowie Account und Kontakte einer Opportunity laden
- Meetings suchen, lesen, anlegen und in freigegebenen Feldern aktualisieren
- Anrufe suchen, lesen, anlegen und in freigegebenen Feldern aktualisieren
- Aufgaben suchen, lesen, anlegen und in freigegebenen Feldern aktualisieren
- normalisierten Activity Stream von Accounts, Contacts und Opportunities lesen
- einzelne, im Activity Stream referenzierte E-Mails mit Klartextinhalt lesen
- explizite Feld-, Filter-, Sortier- und Beziehungs-Allowlist
- höchstens 20 Ergebnisse pro Anfrage
- Audit-Log ohne CRM-Inhalte oder Zugangsdaten

Die Schreibwerkzeuge führen keine Löschoperationen aus. Das Anlegen oder Aktualisieren eines Meetings beziehungsweise Anrufs versendet auch keine Einladungs- oder Absage-E-Mails. Welche Status- und Auswahlwerte gültig sind, hängt von der jeweiligen EspoCRM-Konfiguration ab.

Activity-Stream-Antworten enthalten freigegebene Posts, E-Mail-Betreffzeilen, `emailId`-Verweise und Ereignismetadaten. Anhänge, Reaktionen, rohe EspoCRM-`data`-Objekte sowie alte und neue Werte aus Feldänderungen werden nicht ausgegeben. Post-Texte sind auf 4.000 Zeichen begrenzt.

Das Werkzeug `get_email` liest eine einzelne E-Mail anhand einer `emailId`. Es bevorzugt `bodyPlain` und wandelt HTML nur dann in Text um, wenn kein Klartext vorhanden ist. Pro Aufruf werden standardmäßig 20.000 und höchstens 30.000 Zeichen ausgegeben; längere Inhalte können mit `bodyOffset` abschnittsweise gelesen werden. Anhangsinhalte, BCC, technische Message-IDs und rohe HTML-Inhalte werden nicht zurückgegeben.

## Voraussetzungen

- EspoCRM mit HTTPS und REST API
- separater EspoCRM-API-Benutzer mit Leserechten auf Account, Contact, Opportunity, Email, Meeting, Call und Task
- Create/Edit-Rechte ausschließlich auf Meeting, Call und Task
- keine Delete-Rechte für den API-Benutzer
- für lokalen Betrieb: Node.js 22 oder neuer
- für Claude lokal: Claude Desktop für macOS oder Windows
- für ChatGPT lokal: ChatGPT-Workspace mit Entwicklermodus und Zugriff auf Secure MCP Tunnel
- für Serverbetrieb: Docker, Docker Compose, Caddy und ein öffentlicher HTTPS-Hostname

## Gemeinsame Konfiguration

Kopiere `.env.example` nach `.env` und trage URL und API-Key ein. Die `.env`-Datei ist von Git ausgeschlossen.

```env
ESPOCRM_URL=https://crm.example.de
ESPOCRM_API_KEY=dein-api-key
```

Der Server ergänzt `/api/v1` automatisch. Die Feldfreigaben stehen in `config/permissions.example.yaml`.
Die `.env` und relative Konfigurationspfade werden immer vom Projektordner aus aufgelöst. Der MCP-Client muss deshalb keine EspoCRM-Zugangsdaten in seiner eigenen Konfiguration speichern.

Optionale gemeinsame Werte:

```env
# Optional. Defaults to config/permissions.example.yaml.
ESPOCRM_PERMISSIONS_FILE=config/permissions.example.yaml

# Optional. Audit entries contain metadata only, never record contents.
ESPOCRM_AUDIT_LOG=logs/audit.jsonl
```

### Installationsspezifische Felder

Die Beispiel-Allowlist und die Suchwerkzeuge enthalten die benutzerdefinierten Felder `cEnrichment`, `cRolle` und `cSektor`. Diese Felder gehören nicht zum allgemeinen EspoCRM-Standardschema. Andere Installationen müssen sie in `config/permissions.example.yaml` und den entsprechenden Filtern in `src/server.ts` anpassen oder entfernen.

## Betrieb A: Lokal

Der lokale Betrieb nutzt `stdio`. Der MCP-Server öffnet keinen eingehenden Port. Claude Desktop startet ihn direkt; ChatGPT nutzt bei Bedarf einen ausgehenden Secure MCP Tunnel.

### Lokale Installation

```bash
npm install
npm run check
npm test
npm run build
```

### Claude Desktop lokal anbinden

Claude Desktop startet `dist/index.js` als lokalen Unterprozess. Der Server wird normalerweise nicht manuell gestartet.

Ermittle zuerst absolute Pfade für Node.js und die gebaute Serverdatei:

```bash
command -v node
```

Öffne in Claude Desktop **Settings -> Developer -> Edit Config**. Die Konfigurationsdatei liegt normalerweise hier:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

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

Der Server lädt `.env` automatisch aus seinem Projektordner. Der API-Key muss deshalb nicht in `claude_desktop_config.json` eingetragen werden.

Nach dem Speichern Claude Desktop vollständig beenden und neu starten:

- macOS: **Cmd+Q** oder **Claude -> Quit Claude**
- Windows: Claude über das Symbol im Infobereich mit **Quit/Exit** schließen

Ein Test in einem neuen Chat:

> Suche maximal drei Accounts in EspoCRM und nenne nur ihre Namen.

### ChatGPT lokal über Secure MCP Tunnel anbinden

ChatGPT kann einen lokalen `stdio`-Server nicht direkt starten. Der offizielle [OpenAI Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels) stellt deshalb eine verschlüsselte, ausschließlich ausgehende HTTPS-Verbindung vom lokalen Rechner zu OpenAI her. Es wird kein eingehender Port geöffnet und der EspoCRM-API-Key bleibt in der lokalen `.env`.

Die Tunnel-Funktion und der ChatGPT-Entwicklermodus sind separate Berechtigungen und können je nach Tarif beziehungsweise Workspace-Richtlinie nicht verfügbar sein. Die Tunnel-Variante eignet sich für eine private Entwickler-App im eigenen Workspace; sie ist kein öffentlicher Plugin-Endpunkt.

1. In den [Platform-Tunnel-Einstellungen](https://platform.openai.com/settings/organization/tunnels) einen Tunnel anlegen.
2. Dem Tunnel die zuständige OpenAI-Organisation und den ChatGPT-Workspace zuordnen.
3. Unter [Platform API Keys](https://platform.openai.com/settings/organization/api-keys) einen separaten Laufzeitschlüssel erstellen.
4. Den Schlüssel auf **Restricted** setzen und ausschließlich **Tunnels: Read + Use** freigeben.

Tunnel-ID und Laufzeitschlüssel dürfen nicht in das Repository eingecheckt werden. Unter macOS oder Linux kann der Schlüssel beispielsweise außerhalb des Projekts in einer nur für den eigenen Benutzer lesbaren Datei liegen:

```bash
install -d -m 700 "$HOME/.config/openai/tunnel-client"
read -s tunnel_runtime_key
printf '%s\n' "$tunnel_runtime_key" \
  > "$HOME/.config/openai/tunnel-client/espocrm-local.key"
chmod 600 "$HOME/.config/openai/tunnel-client/espocrm-local.key"
unset tunnel_runtime_key
```

Lade die aktuelle Version aus den offiziellen [`openai/tunnel-client`-Releases](https://github.com/openai/tunnel-client/releases/latest) und prüfe die Installation:

```bash
tunnel-client --version
tunnel-client help quickstart
```

Lokales Tunnel-Profil erstellen:

```bash
tunnel-client init \
  --sample sample_mcp_stdio_local \
  --profile espocrm-local \
  --tunnel-id tunnel_... \
  --mcp-command "/ABSOLUTER/PFAD/ZU/node /ABSOLUTER/PFAD/ZUM/espocrm-mcp-server/dist/index.js" \
  --control-plane-api-key-ref "file:$HOME/.config/openai/tunnel-client/espocrm-local.key"
```

Profil prüfen:

```bash
tunnel-client doctor --profile espocrm-local --explain
```

Tunnel starten:

```bash
tunnel-client runtimes connect \
  --alias espocrm-local \
  --profile espocrm-local \
  --tunnel-id tunnel_... \
  --runtime-api-key "file:$HOME/.config/openai/tunnel-client/espocrm-local.key" \
  --mcp-command "/ABSOLUTER/PFAD/ZU/node /ABSOLUTER/PFAD/ZUM/espocrm-mcp-server/dist/index.js"

tunnel-client runtimes status espocrm-local --json
```

Der Status muss `process_running: true`, `healthy: true` und `ready: true` melden. Ohne laufenden Tunnel bleibt die App in ChatGPT sichtbar, Werkzeugaufrufe schlagen jedoch fehl.

In ChatGPT anschließend:

1. Unter **Settings -> Security and login** den **Developer mode** aktivieren.
2. [ChatGPT Plugins](https://chatgpt.com/plugins) öffnen und **Create app** beziehungsweise **App erstellen** wählen.
3. Unter **Connection** die Option **Tunnel** und den zuvor angelegten Tunnel wählen.
4. Unter **Authentication** die Option **None** beziehungsweise **Keine Authentifizierung** wählen.
5. Vor dem Verbinden kontrollieren, dass genau die erwarteten 28 Werkzeuge erkannt werden.

## Betrieb B: Server mit Docker und Caddy

Der Serverbetrieb nutzt Streamable HTTP. Der Node-Prozess spricht im Container normales HTTP; HTTPS, Hostname und Bearer Token übernimmt Caddy. Der Container-Port sollte nicht öffentlich erreichbar sein.

### Docker starten

Auf dem Server:

```bash
git clone https://github.com/cknebel/espocrm-mcp-server.git
cd espocrm-mcp-server
cp .env.example .env
```

Trage in `.env` mindestens `ESPOCRM_URL` und `ESPOCRM_API_KEY` ein. Für Remote-MCP sind außerdem diese Werte relevant:

```env
MCP_HTTP_HOST=0.0.0.0
MCP_HTTP_PORT=3000
MCP_HTTP_PATH=/mcp
MCP_HTTP_ALLOWED_HOSTS=espocrm-mcp.example.de,127.0.0.1,localhost
MCP_HTTP_ALLOWED_ORIGINS=https://chatgpt.com,https://claude.ai
```

Der Node-MCP-Server prüft selbst keinen Bearer Token. Er ist für den internen Betrieb hinter Caddy gedacht und darf nicht ungeschützt öffentlich erreichbar sein.

Der Compose-Dienst veröffentlicht den Container-Port standardmäßig nur auf `127.0.0.1` des Hosts:

```bash
docker compose up -d --build
```

Lokale Prüfung auf dem Server:

```bash
curl http://127.0.0.1:3000/healthz
```

Erwartete Antwort:

```json
{"ok":true}
```

### Caddy vor den Docker-Dienst setzen

Wenn Caddy auf demselben Host läuft und den auf `127.0.0.1` gebundenen Compose-Port nutzt:

```caddyfile
espocrm-mcp.example.de {
  encode zstd gzip

  route {
    @missing_or_wrong_token {
      not header Authorization "Bearer {$ESPOCRM_MCP_BEARER_TOKEN}"
    }
    respond @missing_or_wrong_token 401

    @mcp path /mcp /mcp/*
    reverse_proxy @mcp 127.0.0.1:3000

    respond 404
  }
}
```

Wenn Caddy im selben Docker-Netzwerk wie der MCP-Container läuft, kann statt `127.0.0.1:3000` der Compose-Dienstname verwendet werden. In diesem Fall sollte der Port nicht zusätzlich über `ports` veröffentlicht werden, sondern nur per `expose` im Compose-Netz sichtbar sein:

```caddyfile
espocrm-mcp.example.de {
  encode zstd gzip

  route {
    @missing_or_wrong_token {
      not header Authorization "Bearer {$ESPOCRM_MCP_BEARER_TOKEN}"
    }
    respond @missing_or_wrong_token 401

    @mcp path /mcp /mcp/*
    reverse_proxy @mcp espocrm-mcp:3000

    respond 404
  }
}
```

Der öffentliche Remote-MCP-Endpunkt ist dann:

```text
https://espocrm-mcp.example.de/mcp
```

Der Bearer Token liegt im Beispiel als Caddy-Umgebungsvariable `ESPOCRM_MCP_BEARER_TOKEN` vor. Dieser Wert muss in der Umgebung des Caddy-Prozesses verfügbar sein. Der MCP-Container benötigt ihn nicht.

### ChatGPT und Claude remote anbinden

Bei der Remote-Variante wird nicht der lokale `stdio`-Server eingebunden, sondern der HTTPS-Endpunkt von Caddy:

```text
https://espocrm-mcp.example.de/mcp
```

In ChatGPT wird dieser Endpunkt als Remote-MCP-App beziehungsweise Custom Connector mit Bearer-Token-Authentifizierung eingetragen. Der Token muss zu `ESPOCRM_MCP_BEARER_TOKEN` im Caddyfile passen.

In Claude wird derselbe Remote-MCP-Endpunkt verwendet. Der praktische „Trick“ ist: Claude muss keinen lokalen Prozess starten und keine EspoCRM-Zugangsdaten kennen; Claude spricht nur mit dem per Caddy geschützten MCP-Endpunkt. Die EspoCRM-Zugangsdaten bleiben ausschließlich in `.env` auf dem Server.

## Werkzeugdetails für Meetings, Anrufe und Aufgaben

Für jede der drei Aktivitätsarten stehen vier Werkzeuge bereit:

| Entität | Suchen | Lesen | Anlegen | Aktualisieren |
| --- | --- | --- | --- | --- |
| Meeting | `search_meetings` | `get_meeting` | `create_meeting` | `update_meeting` |
| Anruf | `search_calls` | `get_call` | `create_call` | `update_call` |
| Aufgabe | `search_tasks` | `get_task` | `create_task` | `update_task` |

Die Suchwerkzeuge unterstützen unter anderem Status, CRM-Zuordnung, zuständigen Benutzer, Startzeitraum, `onlyMy`, Sortierung und Paginierung. Bei Anrufen kann zusätzlich nach Richtung, bei Aufgaben nach Priorität gefiltert werden.

Meetings und Anrufe unterstützen Benutzer, Kontakte und Leads als Teilnehmer. Als übergeordnetes CRM-Objekt sind `Account`, `Contact`, `Lead`, `Opportunity` und `Case` zulässig. Die dazu benötigten IDs müssen bereits bekannt sein; der Server bietet weiterhin keine allgemeinen Werkzeuge für Leads oder Cases.

Für normale Meetings und Anrufe werden `dateStart` und `dateEnd` verwendet. EspoCRM-Datumszeiten sollten im Format `YYYY-MM-DD HH:mm:ss` angegeben werden. Ganztägige Meetings verwenden `isAllDay: true` zusammen mit `dateStartDate` und `dateEndDate` im Format `YYYY-MM-DD`. Aufgaben dürfen Start- und Fälligkeitsdatum mit oder ohne Zeit enthalten.

Die EspoCRM-Standardwerte sind:

- Meeting/Call-Status: `Planned`, `Held`, `Not Held`
- Anrufrichtung: `Outbound`, `Inbound`
- Aufgabenstatus: `Not Started`, `Started`, `Completed`, `Canceled`, `Deferred`
- Aufgabenpriorität: `Low`, `Normal`, `High`, `Urgent`

EspoCRM-Administratoren können Auswahlwerte anpassen. Der Server begrenzt deren Länge, überlässt die fachliche Validierung aber EspoCRM. Update-Werkzeuge senden nur die tatsächlich angegebenen Felder. Nicht in `writableFields` freigegebene Felder werden vor dem API-Aufruf abgelehnt.

Beispielanfragen im MCP-Client:

> Zeige meine geplanten Meetings der nächsten sieben Tage.

> Lege morgen von 10:00 bis 10:30 Uhr einen Anruf mit diesem Kontakt an.

> Markiere diese Aufgabe als abgeschlossen.

## Aktualisieren

### Lokaler Betrieb

```bash
git pull
npm install
npm run check
npm test
npm run build
```

Danach Claude Desktop beziehungsweise den Tunnel-Prozess vollständig neu starten.

### Serverbetrieb

```bash
git pull
docker compose up -d --build
```

Danach in ChatGPT oder Claude die Remote-MCP-App beziehungsweise den Connector bei Bedarf aktualisieren, damit neue Werkzeugdefinitionen neu eingelesen werden.

## Aktualisierung von Version 0.3 auf 0.4

Version 0.4 erweitert das Format der Berechtigungsdatei. Wer eine eigene Datei über `ESPOCRM_PERMISSIONS_FILE` verwendet, muss sie vor dem ersten Start aktualisieren:

1. Bei `Account`, `Contact`, `Opportunity` und `Email` jeweils `writableFields: []` ergänzen.
2. Die Abschnitte `Meeting`, `Call` und `Task` aus `config/permissions.example.yaml` übernehmen und bei Bedarf an die eigene EspoCRM-Installation anpassen.
3. Dem API-Benutzer Leserechte für Meeting, Call und Task sowie Create/Edit-Rechte für diese drei Entitäten geben. Keine Delete-Rechte vergeben.
4. `npm run check`, `npm test` und `npm run build` ausführen.
5. Claude Desktop, Tunnel-Prozess oder Docker-Container neu starten, damit Version 0.4 und alle 28 Werkzeuge geladen werden.

Fehlende Entitäten oder `writableFields` führen absichtlich zu einem Startfehler. Dadurch kann der Server nicht unbemerkt mit einer unvollständigen Sicherheitskonfiguration laufen.

## Fehlerbehebung

### Claude Desktop lokal

Wenn die EspoCRM-Werkzeuge nicht erscheinen:

1. JSON-Syntax der `claude_desktop_config.json` prüfen.
2. Sicherstellen, dass `command` und `args` absolute, vorhandene Pfade enthalten.
3. Prüfen, ob `.env` im Projektordner liegt und URL sowie API-Key gesetzt sind.
4. Im Projekt `npm run check`, `npm test` und `npm run build` ausführen.
5. Claude Desktop vollständig beenden und erneut öffnen.

Claude-Desktop-Protokolle liegen normalerweise hier:

- macOS: `~/Library/Logs/Claude`
- Windows: `%APPDATA%\Claude\logs`

Besonders hilfreich sind `mcp.log` und Dateien nach dem Muster `mcp-server-espocrm.log`.

### ChatGPT lokal über Tunnel

Wenn die App sichtbar ist, aber keine Daten liefert:

1. `tunnel-client runtimes status espocrm-local --json` ausführen und auf `healthy: true` sowie `ready: true` prüfen.
2. `tunnel-client doctor --profile espocrm-local --explain` ausführen.
3. Prüfen, ob der Tunnel der richtigen Platform-Organisation und dem richtigen ChatGPT-Workspace zugeordnet ist.
4. Prüfen, ob der Laufzeitschlüssel **Tunnels: Read + Use** besitzt.
5. Nach Codeänderungen den Tunnel-Prozess neu starten und die App in ChatGPT über **Update/Aktualisieren** neu einlesen.

### Serverbetrieb

Wenn ChatGPT oder Claude den Remote-MCP-Endpunkt nicht erreichen:

1. `docker compose ps` prüfen.
2. Auf dem Server `curl http://127.0.0.1:3000/healthz` ausführen.
3. Prüfen, ob Caddy den richtigen Hostnamen und Pfad `/mcp` weiterleitet.
4. Prüfen, ob der Client denselben Bearer Token sendet, den Caddy erwartet.
5. Prüfen, ob `MCP_HTTP_ALLOWED_HOSTS` den öffentlichen Hostnamen enthält.
6. Caddy-Logs und Container-Logs prüfen.

## Entwicklung

```bash
npm run dev
npm run dev:http
npm run test:watch
```

Siehe [SECURITY.md](SECURITY.md) für das Berechtigungs- und Datenschutzmodell.

## Lizenz

Veröffentlicht unter der [MIT-Lizenz](LICENSE).
