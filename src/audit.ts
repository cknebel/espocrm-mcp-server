import { mkdir, appendFile } from "node:fs/promises";
import { dirname } from "node:path";

export interface AuditEntry {
  tool: string;
  entity: string;
  recordId?: string;
  operation: "list" | "read" | "related" | "stream" | "create" | "update";
  success: boolean;
  resultCount?: number;
  statusCode?: number;
}

export class AuditLogger {
  constructor(private readonly path: string) {}

  async write(entry: AuditEntry): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry });
    await appendFile(this.path, `${line}\n`, { encoding: "utf8", mode: 0o600 });
  }
}
