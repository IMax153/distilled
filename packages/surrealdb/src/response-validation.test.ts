import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { SurrealdbParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getKeyById } from "./services/surrealdb.ts";
import type { SurrealdbOpError } from "./protocol.ts";

// getKeyById declares `Array<{ result?: { id?: string; some?: boolean }[]; status?: string; time?: string }>` — every member is optional, so the mismatch is a wrong primitive.
const run = (body: string) =>
  runValidationModes(
    getKeyById({ table: "person", id: "tobie" }).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("Surrealdb response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = [
      { result: [{ id: "person:tobie" }], status: "OK", time: "1ms" },
    ];
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a member with the wrong primitive type: lenient returns it, validating modes fail", async () => {
    const body = [{ status: 200 }];
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      SurrealdbParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(SurrealdbParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = [
      {
        result: [{ id: "person:tobie" }],
        status: "OK",
        time: "1ms",
        unmodeled: 1,
      },
    ];
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(SurrealdbParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      SurrealdbParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(SurrealdbParseError);
  });
});

// SurrealdbParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [SurrealdbParseError] extends [
  SurrealdbOpError,
]
  ? true
  : false = true;
