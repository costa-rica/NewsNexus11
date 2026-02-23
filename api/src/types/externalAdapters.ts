export type ExternalResponseStatus = 'success' | 'error';

export type NormalizedExternalJsonResponse<TPayload> = {
  ok: boolean;
  statusCode?: number;
  payload: TPayload | null;
  error?: string;
};

export type ExternalAdapterSuccessResult<TItem> = {
  status: 'success';
  items: TItem[];
};

export type ExternalAdapterErrorResult<TItem> = {
  status: 'error';
  items: TItem[];
  error: string;
  statusCode?: number;
};

export type ExternalAdapterResult<TItem> =
  | ExternalAdapterSuccessResult<TItem>
  | ExternalAdapterErrorResult<TItem>;

export type ExternalItemsPayloadShape = {
  articles?: unknown[];
  results?: unknown[];
};
