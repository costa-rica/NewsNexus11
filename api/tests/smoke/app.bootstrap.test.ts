import request from "supertest";
import app from "../helpers/testApp";

describe("app bootstrap smoke tests", () => {
  test("GET /health returns 200", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        ok: true,
        service: "newsnexus11api",
      }),
    );
  });

  test("GET / returns 200", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        message: expect.any(String),
        legacyRoutersEnabled: false,
      }),
    );
  });
});
