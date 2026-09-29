import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { credentials } from "./credentials.ts";
import { S2ParseError } from "./errors.ts";
import type { S2OpError } from "./protocol.ts";
import * as Retry from "./retry.ts";
import { listBasins } from "./services/basins.ts";

// listBasins declares `{ basins: BasinInfo[]; has_more: boolean }`.
const run = (body: string) =>
  runValidationModes(
    listBasins({}).pipe(
      Retry.none,
      Effect.provide(credentials({ token: "test" })),
    ),
    { body },
  );

describe("S2 response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { basins: [], has_more: false };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("{}");
    expect(lenient).toMatchObject({ _tag: "Success", success: {} });
    expect((additionalProperties as any).failure).toBeInstanceOf(S2ParseError);
    expect((strict as any).failure).toBeInstanceOf(S2ParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = { basins: [], has_more: false, unmodeled: 1 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(S2ParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(S2ParseError);
    expect((strict as any).failure).toBeInstanceOf(S2ParseError);
  });
});

// S2ParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [S2ParseError] extends [S2OpError]
  ? true
  : false = true;
