import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { BoatParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getCurrentUser } from "./services/boat.ts";
import type { BoatOpError } from "./protocol.ts";

// getCurrentUser declares `{ ok: boolean; type: string; user: { … } }`.
const run = (body: string) =>
  runValidationModes(
    getCurrentUser({}).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("Boat response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { ok: true, type: "user", user: { login: "octocat" } };
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
      BoatParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(BoatParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      ok: true,
      type: "user",
      user: { login: "octocat" },
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
    expect((strict as any).failure).toBeInstanceOf(BoatParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      BoatParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(BoatParseError);
  });
});

// BoatParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [BoatParseError] extends [BoatOpError]
  ? true
  : false = true;
