import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { ArchilParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { listApiTokens } from "./services/archil.ts";
import type { ArchilOpError } from "./protocol.ts";

// listApiTokens declares `{ success: boolean; data: { tokens?: ApiTokenResponse[] } }`.
const run = (body: string) =>
  runValidationModes(
    listApiTokens({}).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("Archil response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = {
      success: true,
      data: { tokens: [{ id: "tok_1", name: "ci", tokenSuffix: "abcd" }] },
    };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("{}");
    expect(lenient).toMatchObject({ _tag: "Success", success: {} });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      ArchilParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(ArchilParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      success: true,
      data: { tokens: [{ id: "tok_1", name: "ci", tokenSuffix: "abcd" }] },
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
    expect((strict as any).failure).toBeInstanceOf(ArchilParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      ArchilParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(ArchilParseError);
  });
});

// ArchilParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [ArchilParseError] extends [ArchilOpError]
  ? true
  : false = true;
