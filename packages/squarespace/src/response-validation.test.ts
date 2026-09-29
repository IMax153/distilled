import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { SquarespaceParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { listDiscounts } from "./services/squarespace.ts";
import type { SquarespaceOpError } from "./protocol.ts";

// listDiscounts declares `{ discounts: Discount[]; hasNextPage?; hasPreviousPage? }`.
const run = (body: string) =>
  runValidationModes(
    listDiscounts({}).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("Squarespace response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { discounts: [], hasNextPage: false };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = { hasNextPage: false };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      SquarespaceParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(SquarespaceParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = { discounts: [], hasNextPage: false, unmodeled: 1 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(SquarespaceParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      SquarespaceParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(SquarespaceParseError);
  });
});

// SquarespaceParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [SquarespaceParseError] extends [
  SquarespaceOpError,
]
  ? true
  : false = true;
