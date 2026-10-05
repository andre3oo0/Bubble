import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseSender, sendEmail, type Email } from "./email";

const email: Email = { to: "sam@example.com", subject: "Hi", text: "plain", html: "<p>html</p>" };
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(new Response("{}", { status: 201 }));
  vi.stubEnv("EMAIL_FROM", "Bubble <bubble@example.com>");
  vi.stubEnv("BREVO_API_KEY", "");
  vi.stubEnv("RESEND_API_KEY", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  fetchMock.mockReset();
});

describe("parseSender", () => {
  it("splits a name and address", () => {
    expect(parseSender("Bubble <bubble@example.com>")).toEqual({ name: "Bubble", email: "bubble@example.com" });
    expect(parseSender('"Bubble Team" <team@example.com>')).toEqual({ name: "Bubble Team", email: "team@example.com" });
  });

  it("accepts a bare address", () => {
    expect(parseSender("bubble@example.com")).toEqual({ email: "bubble@example.com" });
    expect(parseSender("<bubble@example.com>")).toEqual({ email: "bubble@example.com" });
  });
});

describe("sendEmail", () => {
  it("sends through Brevo when its key is set", async () => {
    vi.stubEnv("BREVO_API_KEY", "brevo-key");
    vi.stubEnv("RESEND_API_KEY", "resend-key");
    await sendEmail(email);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.headers["api-key"]).toBe("brevo-key");
    expect(JSON.parse(init.body)).toEqual({
      sender: { name: "Bubble", email: "bubble@example.com" },
      to: [{ email: "sam@example.com" }],
      subject: "Hi",
      textContent: "plain",
      htmlContent: "<p>html</p>",
    });
  });

  it("falls back to Resend", async () => {
    vi.stubEnv("RESEND_API_KEY", "resend-key");
    await sendEmail(email);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.resend.com/emails");
  });

  it("throws when the provider rejects the email", async () => {
    vi.stubEnv("BREVO_API_KEY", "brevo-key");
    fetchMock.mockResolvedValue(new Response("unauthorised", { status: 401 }));
    await expect(sendEmail(email)).rejects.toThrow(/Brevo rejected the email: 401/);
  });

  it("prints instead of sending when nothing is configured", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await sendEmail(email);
    expect(fetchMock).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
