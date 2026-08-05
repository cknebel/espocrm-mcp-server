import type { EspoListResponse, EspoRecord, ListOptions, SafeFilter } from "./types.js";

export class EspoError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "EspoError";
  }
}

export interface EspoClientOptions {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

function appendFilters(params: URLSearchParams, filters: SafeFilter[]): void {
  filters.forEach((filter, index) => {
    params.set(`whereGroup[${index}][type]`, filter.type);
    params.set(`whereGroup[${index}][attribute]`, filter.attribute);
    if (Array.isArray(filter.value)) {
      filter.value.forEach((value, valueIndex) => {
        params.set(`whereGroup[${index}][value][${valueIndex}]`, value);
      });
    } else {
      params.set(`whereGroup[${index}][value]`, String(filter.value));
    }
  });
}

export class EspoClient {
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly options: EspoClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  private async getJson<T>(path: string, params?: URLSearchParams): Promise<T> {
    const url = new URL(`${this.options.baseUrl}/${path.replace(/^\/+/, "")}`);
    if (params) url.search = params.toString();

    const response = await this.fetchImpl(url, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(this.timeoutMs),
      headers: {
        Accept: "application/json",
        "X-Api-Key": this.options.apiKey,
        "X-No-Total": "true",
      },
    });

    if (!response.ok) {
      throw new EspoError(`EspoCRM request failed with HTTP ${response.status}.`, response.status);
    }
    return (await response.json()) as T;
  }

  async list(entity: string, fields: string[], options: ListOptions): Promise<EspoListResponse> {
    const params = new URLSearchParams({
      maxSize: String(options.limit),
      offset: String(options.offset),
      order: options.order ?? "asc",
      attributeSelect: fields.join(","),
    });
    if (options.query) params.set("textFilter", options.query);
    if (options.orderBy) params.set("orderBy", options.orderBy);
    if (options.primaryFilter) params.set("primaryFilter", options.primaryFilter);
    if (options.onlyMy) params.set("boolFilterList[0]", "onlyMy");
    if (options.filters) appendFilters(params, options.filters);
    return this.getJson<EspoListResponse>(entity, params);
  }

  async read(entity: string, id: string): Promise<EspoRecord> {
    return this.getJson<EspoRecord>(`${entity}/${encodeURIComponent(id)}`);
  }

  async related(entity: string, id: string, link: string, fields: string[], options: ListOptions): Promise<EspoListResponse> {
    const params = new URLSearchParams({
      maxSize: String(options.limit),
      offset: String(options.offset),
      order: options.order ?? "asc",
      attributeSelect: fields.join(","),
    });
    if (options.orderBy) params.set("orderBy", options.orderBy);
    return this.getJson<EspoListResponse>(`${entity}/${encodeURIComponent(id)}/${link}`, params);
  }
}
