import express from "express";
import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

jest.mock("../../src/modules/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock("../../src/middleware/rateLimiting", () => {
  const passthrough = (_req: any, _res: any, next: any) => next();
  return {
    loginLimiter: passthrough,
    registerLimiter: passthrough,
    passwordResetLimiter: passthrough,
  };
});

jest.mock("../../src/modules/mailer", () => ({
  sendResetPasswordEmail: jest.fn().mockResolvedValue(undefined),
}));

const mockUserModel = {
  findOne: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
};

const mockEntityWhoFoundArticleModel = {
  create: jest.fn(),
};

jest.mock("@newsnexus/db-models", () => ({
  User: mockUserModel,
  EntityWhoFoundArticle: mockEntityWhoFoundArticleModel,
}));

const usersRouter = require("../../src/routes/users");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/users", usersRouter);
  return app;
}

describe("users routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
    process.env.URL_BASE_TO_WEBSITE = "https://example.com";
    process.env.AUTHENTIFICATION_TURNED_OFF = "false";
  });

  test("POST /users/register creates user and returns token", async () => {
    mockUserModel.findOne.mockResolvedValue(null);
    mockUserModel.create.mockResolvedValue({
      id: 1,
      username: "test",
      email: "test@example.com",
      isAdmin: false,
    });

    const app = buildApp();
    const response = await request(app)
      .post("/users/register")
      .send({ email: "test@example.com", password: "password123" });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("token");
    expect(response.body.user.email).toBe("test@example.com");
    expect(mockEntityWhoFoundArticleModel.create).toHaveBeenCalledWith({
      userId: 1,
    });
  });

  test("POST /users/register rejects duplicate email", async () => {
    mockUserModel.findOne.mockResolvedValue({
      id: 99,
      email: "dupe@example.com",
    });

    const app = buildApp();
    const response = await request(app)
      .post("/users/register")
      .send({ email: "dupe@example.com", password: "password123" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("User already exists");
  });

  test("POST /users/login returns user-not-found for unknown email", async () => {
    mockUserModel.findOne.mockResolvedValue(null);

    const app = buildApp();
    const response = await request(app)
      .post("/users/login")
      .send({ email: "missing@example.com", password: "password123" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("User not found");
  });

  test("POST /users/login rejects invalid password", async () => {
    const hashedPassword = await bcrypt.hash("correct-password", 10);
    mockUserModel.findOne.mockResolvedValue({
      id: 2,
      password: hashedPassword,
      username: "user2",
      email: "user2@example.com",
      isAdmin: false,
    });

    const app = buildApp();
    const response = await request(app)
      .post("/users/login")
      .send({ email: "user2@example.com", password: "wrong-password" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid password");
  });

  test("POST /users/request-password-reset returns success for known user", async () => {
    mockUserModel.findOne.mockResolvedValue({
      id: 5,
      email: "known@example.com",
    });

    const app = buildApp();
    const response = await request(app)
      .post("/users/request-password-reset")
      .send({ email: "known@example.com" });

    expect(response.status).toBe(200);
    expect(response.body.result).toBe(true);
  });

  test("POST /users/request-password-reset returns 400 when email is missing", async () => {
    const app = buildApp();
    const response = await request(app)
      .post("/users/request-password-reset")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.result).toBe(false);
    expect(response.body.error).toBe("Email is required");
  });

  test("POST /users/reset-password/:token rejects invalid token", async () => {
    const app = buildApp();
    const response = await request(app)
      .post("/users/reset-password/not-a-real-token")
      .send({ newPassword: "new-password" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid reset token");
  });

  test("DELETE /users/:id rejects when auth token missing", async () => {
    const app = buildApp();
    const response = await request(app).delete("/users/1");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Token is required");
  });

  test("POST /users/reset-password/:token succeeds with valid token", async () => {
    const token = jwt.sign({ id: 7 }, process.env.JWT_SECRET as string);
    const update = jest.fn().mockResolvedValue(undefined);
    mockUserModel.findByPk.mockResolvedValue({ id: 7, update });

    const app = buildApp();
    const response = await request(app)
      .post(`/users/reset-password/${token}`)
      .send({ newPassword: "new-password-123" });

    expect(response.status).toBe(200);
    expect(response.body.result).toBe(true);
    expect(update).toHaveBeenCalled();
  });
});
