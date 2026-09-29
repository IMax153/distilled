import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromPassword } from "./credentials.ts";
import { OpencodeParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { globalHealth } from "./services/opencode.ts";
import type { OpencodeOpError } from "./protocol.ts";

// globalHealth declares `{ healthy: boolean; version: string }`.
const run = (body: string) =>
  runValidationModes(
    globalHealth({}).pipe(
      Retry.none,
      Effect.provide(fromPassword({ password: "test" })),
    ),
    { body },
  );

const matching = { healthy: true, version: "1.0.0" };

describe("Opencode response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const modes = await run(JSON.stringify(matching));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: matching });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = { healthy: true };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      OpencodeParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(OpencodeParseError);
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
    expect((strict as any).failure).toBeInstanceOf(OpencodeParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      OpencodeParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(OpencodeParseError);
  });
});

// OpencodeParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [OpencodeParseError] extends [
  OpencodeOpError,
]
  ? true
  : false = true;
