import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Redacted from "effect/Redacted";
import { DopplerParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { generateCliAuth } from "./services/doppler.ts";
import type { DopplerOpError } from "./protocol.ts";

// generateCliAuth declares required `code`, `polling_code` (sensitive), and
// `auth_url`. It uses the unauthenticated protocol, so no credentials.
const run = (body: string) =>
  runValidationModes(
    generateCliAuth({
      hostname: "host",
      version: "3.0.0",
      os: "linux",
      arch: "x64",
    }).pipe(Retry.none),
    { body },
  );

const matching = {
  code: "abc",
  polling_code: "secret",
  auth_url: "https://dashboard.doppler.com/workplace/auth/cli",
};

describe("Doppler response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const modes = await run(JSON.stringify(matching));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({
        _tag: "Success",
        success: { code: matching.code, auth_url: matching.auth_url },
      });
      const pollingCode: Redacted.Redacted<string> = (result as any).success
        .polling_code;
      expect(Redacted.value(pollingCode)).toBe("secret");
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = { code: "abc" };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      DopplerParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(DopplerParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = { ...matching, unmodeled: 1 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    for (const result of [lenient, additionalProperties]) {
      expect(result).toMatchObject({
        _tag: "Success",
        success: { code: body.code, auth_url: body.auth_url, unmodeled: 1 },
      });
      const pollingCode: Redacted.Redacted<string> = (result as any).success
        .polling_code;
      expect(Redacted.value(pollingCode)).toBe("secret");
    }
    expect((strict as any).failure).toBeInstanceOf(DopplerParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      DopplerParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(DopplerParseError);
  });
});

// DopplerParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [DopplerParseError] extends [DopplerOpError]
  ? true
  : false = true;
