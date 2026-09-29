import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { ApacheSupersetParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getMe } from "./services/superset.ts";
import type { ApacheSupersetOpError } from "./protocol.ts";

// getMe declares `{ result?: UserResponseSchema }`; every member is optional,
// so the mismatch is a wrong primitive (`result.id` must be a number).
const run = (body: string) =>
  runValidationModes(
    getMe({}).pipe(Retry.none, Effect.provide(fromApiKey({ apiKey: "test" }))),
    { body },
  );

describe("Apache Superset response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { result: { id: 1, username: "admin", is_active: true } };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body with a wrong primitive type: lenient returns it, validating modes fail", async () => {
    const body = { result: { id: "one" } };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      ApacheSupersetParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(ApacheSupersetParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      result: { id: 1, username: "admin", is_active: true },
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
    expect((strict as any).failure).toBeInstanceOf(ApacheSupersetParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      ApacheSupersetParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(ApacheSupersetParseError);
  });
});

// ApacheSupersetParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [ApacheSupersetParseError] extends [
  ApacheSupersetOpError,
]
  ? true
  : false = true;
