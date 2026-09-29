import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { GrowthBookParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getCodeRefs } from "./services/growthbook.ts";
import type { GrowthBookOpError } from "./protocol.ts";

// getCodeRefs declares `{ codeRefs: CodeRef[] }`.
const run = (body: string) =>
  runValidationModes(
    getCodeRefs({ id: "feature-a" }).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("GrowthBook response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { codeRefs: [] };
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
      GrowthBookParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(GrowthBookParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = { codeRefs: [], unmodeled: 1 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(GrowthBookParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      GrowthBookParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(GrowthBookParseError);
  });
});

// GrowthBookParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [GrowthBookParseError] extends [
  GrowthBookOpError,
]
  ? true
  : false = true;
