import express from "express";
import request from "supertest";

jest.mock("../../src/modules/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock("../../src/modules/userAuthentication", () => ({
  authenticateToken: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const mockAiApproverPromptVersion = {
  create: jest.fn(),
  findAll: jest.fn(),
  findByPk: jest.fn(),
};

const mockAiApproverArticleScore = {
  count: jest.fn(),
};

jest.mock("@newsnexus/db-models", () => ({
  AiApproverPromptVersion: mockAiApproverPromptVersion,
  AiApproverArticleScore: mockAiApproverArticleScore,
}));

const aiApproverRouter = require("../../src/routes/analysis/ai-approver");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/analysis/ai-approver", aiApproverRouter);
  return app;
}

describe("analysis ai approver routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET /analysis/ai-approver/prompts returns prompt rows", async () => {
    mockAiApproverPromptVersion.findAll.mockResolvedValue([
      { id: 2, name: "Residential Fire", isActive: true },
    ]);

    const app = buildApp();
    const response = await request(app).get("/analysis/ai-approver/prompts");

    expect(response.status).toBe(200);
    expect(response.body.result).toBe(true);
    expect(response.body.count).toBe(1);
  });

  test("POST /analysis/ai-approver/prompts validates required fields", async () => {
    const app = buildApp();
    const response = await request(app)
      .post("/analysis/ai-approver/prompts")
      .send({ name: "", promptInMarkdown: "" });

    expect(response.status).toBe(400);
    expect(response.body.result).toBe(false);
  });

  test("POST /analysis/ai-approver/prompts creates a prompt row", async () => {
    mockAiApproverPromptVersion.create.mockResolvedValue({
      id: 3,
      name: "Residential Fire",
      isActive: true,
    });

    const app = buildApp();
    const response = await request(app)
      .post("/analysis/ai-approver/prompts")
      .send({
        name: "Residential Fire",
        description: "Prompt for house fires",
        promptInMarkdown: "# Task",
        isActive: true,
      });

    expect(response.status).toBe(201);
    expect(response.body.result).toBe(true);
    expect(mockAiApproverPromptVersion.create).toHaveBeenCalledWith({
      name: "Residential Fire",
      description: "Prompt for house fires",
      promptInMarkdown: "# Task",
      isActive: true,
      endedAt: null,
    });
  });

  test("POST /analysis/ai-approver/prompts/:promptVersionId/copy copies an existing prompt", async () => {
    mockAiApproverPromptVersion.findByPk.mockResolvedValue({
      id: 4,
      name: "Residential Fire",
      description: "Prompt for house fires",
      promptInMarkdown: "# Task",
    });
    mockAiApproverPromptVersion.create.mockResolvedValue({
      id: 5,
      name: "Residential Fire (copy)",
    });

    const app = buildApp();
    const response = await request(app).post(
      "/analysis/ai-approver/prompts/4/copy",
    );

    expect(response.status).toBe(201);
    expect(response.body.result).toBe(true);
    expect(mockAiApproverPromptVersion.create).toHaveBeenCalledWith({
      name: "Residential Fire (copy)",
      description: "Prompt for house fires",
      promptInMarkdown: "# Task",
      isActive: false,
      endedAt: null,
    });
  });

  test("PATCH /analysis/ai-approver/prompts/:promptVersionId/active updates active state", async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    mockAiApproverPromptVersion.findByPk.mockResolvedValue({
      id: 8,
      update,
    });

    const app = buildApp();
    const response = await request(app)
      .patch("/analysis/ai-approver/prompts/8/active")
      .send({ isActive: false });

    expect(response.status).toBe(200);
    expect(response.body.result).toBe(true);
    expect(update).toHaveBeenCalledWith({
      isActive: false,
      endedAt: expect.any(Date),
    });
  });

  test("DELETE /analysis/ai-approver/prompts/:promptVersionId blocks delete when score rows exist", async () => {
    mockAiApproverPromptVersion.findByPk.mockResolvedValue({
      id: 9,
      destroy: jest.fn(),
    });
    mockAiApproverArticleScore.count.mockResolvedValue(2);

    const app = buildApp();
    const response = await request(app).delete(
      "/analysis/ai-approver/prompts/9",
    );

    expect(response.status).toBe(409);
    expect(response.body.result).toBe(false);
  });

  test("DELETE /analysis/ai-approver/prompts/:promptVersionId deletes unused prompt rows", async () => {
    const destroy = jest.fn().mockResolvedValue(undefined);
    mockAiApproverPromptVersion.findByPk.mockResolvedValue({
      id: 10,
      destroy,
    });
    mockAiApproverArticleScore.count.mockResolvedValue(0);

    const app = buildApp();
    const response = await request(app).delete(
      "/analysis/ai-approver/prompts/10",
    );

    expect(response.status).toBe(200);
    expect(response.body.result).toBe(true);
    expect(destroy).toHaveBeenCalled();
  });
});
