import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { RenderParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getUser } from "./services/render.ts";
import type { RenderOpError } from "./protocol.ts";

// getUser declares `{ email: string; name: string }`.
const run = (body: string) =>
  runValidationModes(
    getUser({}).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("Render response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { email: "test@example.com", name: "Test" };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("{}");
    expect(lenient).toMatchObject({ _tag: "Success", success: {} });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      RenderParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(RenderParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = { email: "test@example.com", name: "Test", unmodeled: 1 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(RenderParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      RenderParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(RenderParseError);
  });
});

// RenderParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [RenderParseError] extends [RenderOpError]
  ? true
  : false = true;
