import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { SpacetimeDBParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getDatabase } from "./services/spacetimedb.ts";
import type { SpacetimeDBOpError } from "./protocol.ts";

// getDatabase declares `{ database_identity; owner_identity; host_type; initial_program }`.
const run = (body: string) =>
  runValidationModes(
    getDatabase({ name_or_identity: "quickstart" }).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("SpacetimeDB response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = {
      database_identity: "c200",
      owner_identity: "c201",
      host_type: "wasm",
      initial_program: "abc",
    };
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
      SpacetimeDBParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(SpacetimeDBParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      database_identity: "c200",
      owner_identity: "c201",
      host_type: "wasm",
      initial_program: "abc",
      unmodeled: 1,
    };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(SpacetimeDBParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      SpacetimeDBParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(SpacetimeDBParseError);
  });
});

// SpacetimeDBParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [SpacetimeDBParseError] extends [
  SpacetimeDBOpError,
]
  ? true
  : false = true;
