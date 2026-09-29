import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { InngestParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { fetchV2Account } from "./services/inngest.ts";
import type { InngestOpError } from "./protocol.ts";

// fetchV2Account declares `{ data?: V2Account; metadata?: … }`; every member is
// optional, so the mismatch is a wrong primitive (`data.email` must be a string).
const run = (body: string) =>
  runValidationModes(
    fetchV2Account({}).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("Inngest response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { data: { id: "acct_1", email: "a@example.com" } };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body with a wrong primitive type: lenient returns it, validating modes fail", async () => {
    const body = { data: { email: 42 } };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      InngestParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(InngestParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      data: { id: "acct_1", email: "a@example.com" },
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
    expect((strict as any).failure).toBeInstanceOf(InngestParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      InngestParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(InngestParseError);
  });
});

// InngestParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [InngestParseError] extends [InngestOpError]
  ? true
  : false = true;
