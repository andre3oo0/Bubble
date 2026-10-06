import { createHash } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isBreachedPassword } from "./passwordCheck";

const fetchMock = vi.fn();
const hash = createHash("sha1").update("password123").digest("hex").toUpperCase();

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("isBreachedPassword", () => {
  it("sends only the first 5 characters of the hash", async () => {
    fetchMock.mockResolvedValue(new Response(""));
    await isBreachedPassword("password123");
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`);
    expect(url).not.toContain(hash.slice(5));
  });

  it("finds a breached password", async () => {
    fetchMock.mockResolvedValue(new Response(`0000000000000000000000000000000000A:3\r\n${hash.slice(5)}:2413945\r\n`));
    expect(await isBreachedPassword("password123")).toBe(true);
  });

  it("ignores padding entries with a count of 0", async () => {
    fetchMock.mockResolvedValue(new Response(`${hash.slice(5)}:0\r\n`));
    expect(await isBreachedPassword("password123")).toBe(false);
  });

  it("lets the password through when the service is down", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    expect(await isBreachedPassword("password123")).toBe(false);
    fetchMock.mockResolvedValue(new Response("busy", { status: 503 }));
    expect(await isBreachedPassword("password123")).toBe(false);
  });
});
