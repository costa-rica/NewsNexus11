type JsonLike =
  | string
  | number
  | boolean
  | null
  | JsonLike[]
  | { [key: string]: JsonLike };

export type DynamicLlmAnalysis = {
  llmResponse?: 'success' | 'failed';
  llmName?: string;
  [key: string]: JsonLike | undefined;
};

export type LlmPayloadValidation =
  | { isValid: true; value: DynamicLlmAnalysis }
  | { isValid: false; error: string };

export type AiContractValueFields =
  | {
      kind: 'boolean';
      valueString: null;
      valueNumber: null;
      valueBoolean: boolean;
    }
  | {
      kind: 'number';
      valueString: null;
      valueNumber: number;
      valueBoolean: null;
    }
  | {
      kind: 'string';
      valueString: string;
      valueNumber: null;
      valueBoolean: null;
    }
  | {
      kind: 'json';
      valueString: string;
      valueNumber: null;
      valueBoolean: null;
    };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonLike(value: unknown): value is JsonLike {
  if (value === null) return true;

  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((entry) => isJsonLike(entry));
  }

  if (isPlainObject(value)) {
    return Object.values(value).every((entry) => isJsonLike(entry));
  }

  return false;
}

export function validateDynamicLlmAnalysis(input: unknown): LlmPayloadValidation {
  if (!isPlainObject(input)) {
    return {
      isValid: false,
      error: 'llmAnalysis payload must be a plain object',
    };
  }

  const payload = input as Record<string, unknown>;

  if (
    payload.llmResponse !== undefined &&
    payload.llmResponse !== 'success' &&
    payload.llmResponse !== 'failed'
  ) {
    return {
      isValid: false,
      error: 'llmAnalysis.llmResponse must be "success" or "failed" when provided',
    };
  }

  if (payload.llmName !== undefined && typeof payload.llmName !== 'string') {
    return {
      isValid: false,
      error: 'llmAnalysis.llmName must be a string when provided',
    };
  }

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) {
      return {
        isValid: false,
        error: `llmAnalysis.${key} must not be undefined`,
      };
    }

    if (!isJsonLike(value)) {
      return {
        isValid: false,
        error: `llmAnalysis.${key} contains unsupported value type`,
      };
    }
  }

  return {
    isValid: true,
    value: payload as DynamicLlmAnalysis,
  };
}

export function toAiContractValueFields(value: JsonLike): AiContractValueFields {
  if (typeof value === 'boolean') {
    return {
      kind: 'boolean',
      valueString: null,
      valueNumber: null,
      valueBoolean: value,
    };
  }

  if (typeof value === 'number') {
    return {
      kind: 'number',
      valueString: null,
      valueNumber: value,
      valueBoolean: null,
    };
  }

  if (typeof value === 'string') {
    return {
      kind: 'string',
      valueString: value,
      valueNumber: null,
      valueBoolean: null,
    };
  }

  return {
    kind: 'json',
    valueString: JSON.stringify(value),
    valueNumber: null,
    valueBoolean: null,
  };
}
