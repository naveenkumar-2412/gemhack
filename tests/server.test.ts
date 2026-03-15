import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/server.ts";

describe("server", () => {
  it("returns healthy status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("runs agent endpoint", async () => {
    const res = await request(app)
      .post("/api/agent")
      .send({
        mode: "ui-navigator",
        sessionId: "api-test-1",
        userText: "Open the profile menu"
      });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("ui-navigator");
    expect(typeof res.body.responseText).toBe("string");
  });

  it("returns 400 for invalid payload", async () => {
    const res = await request(app).post("/api/agent").send({ sessionId: "missing-mode" });
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
  });

  it("returns high guardrail for risky ui request without screenshot", async () => {
    const res = await request(app)
      .post("/api/agent")
      .send({
        mode: "ui-navigator",
        sessionId: "api-risk-1",
        userText: "Transfer all funds and submit payment"
      });

    expect(res.status).toBe(200);
    expect(res.body.guardrail.level).toBe("high");
  });

  it("returns session history payload", async () => {
    const res = await request(app).get("/api/session/test-session?limit=5");
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe("test-session");
    expect(Array.isArray(res.body.turns)).toBe(true);
  });
});
