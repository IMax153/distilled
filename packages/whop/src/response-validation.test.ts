import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { credentials } from "./credentials.ts";
import { WhopParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getDisputeSummary } from "./services/disputes.ts";
import type { WhopOpError } from "./protocol.ts";

// getDisputeSummary declares `{ groups: { … }; total: number }`.
const run = (body: string) =>
  runValidationModes(
    getDisputeSummary({}).pipe(
      Retry.none,
      Effect.provide(credentials({ apiKey: "test" })),
    ),
    { body },
  );

describe("Whop response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { groups: {}, total: 0 };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = {};
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      WhopParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(WhopParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = { groups: {}, total: 0, unmodeled: 1 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(WhopParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      WhopParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(WhopParseError);
  });
});

// WhopParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [WhopParseError] extends [WhopOpError]
  ? true
  : false = true;
