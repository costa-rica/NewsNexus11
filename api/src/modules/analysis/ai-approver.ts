type PromptBody = {
  name?: unknown;
  description?: unknown;
  promptInMarkdown?: unknown;
  isActive?: unknown;
};

type ActiveBody = {
  isActive?: unknown;
};

export function validatePromptCreateRequest(body: PromptBody): {
  isValid: boolean;
  error?: string;
} {
  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return {
      isValid: false,
      error: "name is required",
    };
  }

  if (
    typeof body.promptInMarkdown !== "string" ||
    body.promptInMarkdown.trim().length === 0
  ) {
    return {
      isValid: false,
      error: "promptInMarkdown is required",
    };
  }

  if (
    body.description !== undefined &&
    body.description !== null &&
    typeof body.description !== "string"
  ) {
    return {
      isValid: false,
      error: "description must be a string if provided",
    };
  }

  if (body.isActive !== undefined && typeof body.isActive !== "boolean") {
    return {
      isValid: false,
      error: "isActive must be a boolean if provided",
    };
  }

  return { isValid: true };
}

export function validatePromptActiveRequest(body: ActiveBody): {
  isValid: boolean;
  error?: string;
} {
  if (typeof body.isActive !== "boolean") {
    return {
      isValid: false,
      error: "isActive must be a boolean",
    };
  }

  return { isValid: true };
}

export function parseNumericId(value: string | string[] | undefined): number | null {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
}
