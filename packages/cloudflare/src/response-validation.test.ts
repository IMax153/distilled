import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { credentials } from "./credentials.ts";
import { CloudflareParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getAccount } from "./services/accounts.ts";
import { verifyToken } from "./services/user.ts";
import type { CloudflareOpError } from "./protocol.ts";

// verifyToken declares `{ id: string; status: string; expiresOn?: string | null; notBefore?: string | null }`,
// unwrapped from the `{ success, errors, messages, result }` envelope.
const run = (body: string) =>
  runValidationModes(
    verifyToken({}).pipe(
      Retry.none,
      Effect.provide(credentials({ apiToken: "test" })),
    ),
    { body },
  );

// getAccount declares `settings?: { abuseContactEmail?; enforceTwofactor? } | null`.
const runGetAccount = (body: string) =>
  runValidationModes(
    getAccount({ accountId: "023e105f4ecef8ad9ca31a8372d0c353" }).pipe(
      Retry.none,
      Effect.provide(credentials({ apiToken: "test" })),
    ),
    { body },
  );

const envelope = (result: unknown) =>
  JSON.stringify({ success: true, errors: [], messages: [], result });

describe("Cloudflare response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const modes = await run(
      envelope({
        id: "ed17574386854bf78a67040be0a770b0",
        status: "active",
        expires_on: "2030-01-01T00:00:00Z",
      }),
    );
    const expected = {
      id: "ed17574386854bf78a67040be0a770b0",
      status: "active",
      expiresOn: "2030-01-01T00:00:00Z",
    };
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: expected });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run(
      envelope({ id: "ed17574386854bf78a67040be0a770b0" }),
    );
    expect(lenient).toMatchObject({
      _tag: "Success",
      success: { id: "ed17574386854bf78a67040be0a770b0" },
    });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      CloudflareParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(CloudflareParseError);
  });

  test("an unmodeled member of `result`: lenient and additionalProperties succeed, strict fails", async () => {
    const { lenient, additionalProperties, strict } = await run(
      envelope({
        id: "ed17574386854bf78a67040be0a770b0",
        status: "active",
        unmodeled: 1,
      }),
    );
    // The output struct is built from modeled members only, so a top-level
    // unmodeled member is dropped rather than returned.
    for (const result of [lenient, additionalProperties]) {
      expect(result).toMatchObject({
        _tag: "Success",
        success: { id: "ed17574386854bf78a67040be0a770b0", status: "active" },
      });
      expect((result as any).success).not.toHaveProperty("unmodeled");
    }
    expect((strict as any).failure).toBeInstanceOf(CloudflareParseError);
  });

  test("an unmodeled member nested in a modeled object: lenient and additionalProperties return it, strict fails", async () => {
    const { lenient, additionalProperties, strict } = await runGetAccount(
      envelope({
        id: "023e105f4ecef8ad9ca31a8372d0c353",
        name: "Demo Account",
        type: "standard",
        settings: { enforce_twofactor: false, unmodeled: 1 },
      }),
    );
    for (const result of [lenient, additionalProperties]) {
      expect(result).toMatchObject({
        _tag: "Success",
        success: { settings: { enforceTwofactor: false, unmodeled: 1 } },
      });
    }
    expect((strict as any).failure).toBeInstanceOf(CloudflareParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      CloudflareParseError,
    );
    expect((additionalProperties as any).failure.body).toBe("not json");
    expect((strict as any).failure).toBeInstanceOf(CloudflareParseError);
    expect((strict as any).failure.body).toBe("not json");
  });
});

// CloudflareParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [CloudflareParseError] extends [
  CloudflareOpError,
]
  ? true
  : false = true;
