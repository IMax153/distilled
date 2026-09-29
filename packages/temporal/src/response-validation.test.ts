import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { TemporalParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getSystemInfo } from "./services/temporal.ts";
import type { TemporalOpError } from "./protocol.ts";

// getSystemInfo declares only optional members (`serverVersion?: string`,
// `capabilities?: {...}`), so the mismatch is a wrong primitive type.
const run = (body: string) =>
  runValidationModes(
    getSystemInfo({}).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

const matching = { serverVersion: "1.27.0" };

describe("Temporal response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const modes = await run(JSON.stringify(matching));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: matching });
    }
  });

  test("a member with the wrong primitive type: lenient returns it, validating modes fail", async () => {
    const body = { serverVersion: 127 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      TemporalParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(TemporalParseError);
  });

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
    expect((strict as any).failure).toBeInstanceOf(TemporalParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      TemporalParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(TemporalParseError);
  });
});

// TemporalParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [TemporalParseError] extends [
  TemporalOpError,
]
  ? true
  : false = true;
