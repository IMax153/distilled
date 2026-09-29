import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { credentials } from "./credentials.ts";
import { SlackParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { billingInfo } from "./services/team.ts";
import type { SlackOpError } from "./protocol.ts";

// team.billing.info declares `{ ok: boolean; plan: string }`; the payload
// shares the level of Slack's `{ ok: true, ... }` envelope.
const run = (body: string, headers?: Record<string, string>) =>
  runValidationModes(
    billingInfo({}).pipe(
      Retry.none,
      Effect.provide(credentials({ token: "xoxb-test" })),
    ),
    { body, headers },
  );

const matching = { ok: true, plan: "free" };

describe("Slack response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const modes = await run(JSON.stringify(matching));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: matching });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = { ok: true };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      SlackParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(SlackParseError);
  });

  // The envelope is the payload, so the unmodeled member sits beside `ok`.
  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = { ...matching, unmodeled: 1 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(SlackParseError);
  });

  // A non-JSON 2xx body is read as raw bytes (the admin.analytics.getFile
  // download); lenient returns them, validating modes fail them for a struct
  // output.
  test("a non-JSON body: lenient returns the raw bytes, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json", {
      "content-type": "application/gzip",
    });
    expect(lenient._tag).toBe("Success");
    const bytes = (lenient as any).success;
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(bytes)).toBe("not json");
    expect((additionalProperties as any).failure).toBeInstanceOf(
      SlackParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(SlackParseError);
  });
});

// SlackParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [SlackParseError] extends [SlackOpError]
  ? true
  : false = true;
