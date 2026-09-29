import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { TurbopufferParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { listNamespaces } from "./services/turbopuffer.ts";
import type { TurbopufferOpError } from "./protocol.ts";

// listNamespaces declares `{ namespaces?: { id: string }[]; next_cursor?: string }`.
const run = (body: string) =>
  runValidationModes(
    listNamespaces({}).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("Turbopuffer response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { namespaces: [{ id: "ns-1" }], next_cursor: "c1" };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = { namespaces: [{}] };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      TurbopufferParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(TurbopufferParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      namespaces: [{ id: "ns-1" }],
      next_cursor: "c1",
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
    expect((strict as any).failure).toBeInstanceOf(TurbopufferParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      TurbopufferParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(TurbopufferParseError);
  });
});

// TurbopufferParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [TurbopufferParseError] extends [
  TurbopufferOpError,
]
  ? true
  : false = true;
