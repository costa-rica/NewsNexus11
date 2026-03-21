jest.mock("../../src/modules/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const modelNames = [
  "AiApproverArticleScore",
  "AiApproverPromptVersion",
  "ArticleContents02",
  "Article",
  "Prompt",
];

const dbMock: Record<string, any> = {
  sequelize: {
    query: jest.fn(),
  },
  initModels: jest.fn(),
  helperValue: "not-a-model",
};

for (const name of modelNames) {
  dbMock[name] = {
    findAll: jest.fn().mockResolvedValue(
      name === "AiApproverArticleScore"
        ? [{ id: 1, articleId: 10, promptVersionId: 2, resultStatus: "completed" }]
        : name === "AiApproverPromptVersion"
          ? [{ id: 2, name: "Prompt 1", promptInMarkdown: "# Prompt", isActive: true }]
          : []
    ),
    bulkCreate: jest.fn(),
  };
}

jest.mock("@newsnexus/db-models", () => dbMock);

describe("adminDb module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("createDatabaseBackupZipFile includes dynamically exported AI approver models", async () => {
    const fs = await import("fs");
    const os = await import("os");
    const path = await import("path");
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "api-admin-db-backup-"));
    process.env.PATH_DB_BACKUPS = tempDir;

    const { createDatabaseBackupZipFile } = await import("../../src/modules/adminDb");

    const zipFilePath = await createDatabaseBackupZipFile();

    expect(dbMock.AiApproverArticleScore.findAll).toHaveBeenCalledWith({ raw: true });
    expect(dbMock.AiApproverPromptVersion.findAll).toHaveBeenCalledWith({ raw: true });
    expect(zipFilePath).toContain("db_backup_");

    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });
});
