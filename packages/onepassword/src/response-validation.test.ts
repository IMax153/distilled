import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { OnepasswordParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getVaults } from "./services/onepassword.ts";
import type { OnepasswordOpError } from "./protocol.ts";

// getVaults declares `Vault[]` with every Vault member optional, so the mismatch is a wrong primitive.
const run = (body: string) =>
  runValidationModes(
    getVaults({}).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("Onepassword response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = [{ id: "v1", name: "Private", items: 3 }];
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a member with the wrong primitive type: lenient returns it, validating modes fail", async () => {
    const body = [{ id: 1, name: "Private" }];
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      OnepasswordParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(OnepasswordParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = [{ id: "v1", name: "Private", items: 3, unmodeled: 1 }];
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(OnepasswordParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      OnepasswordParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(OnepasswordParseError);
  });
});

// OnepasswordParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [OnepasswordParseError] extends [
  OnepasswordOpError,
]
  ? true
  : false = true;
