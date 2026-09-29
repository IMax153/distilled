import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { PlaidParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getRecipients } from "./services/plaid.ts";
import type { PlaidOpError } from "./protocol.ts";

// getRecipients declares `{ recipients: Recipient[] }`.
const run = (body: string) =>
  runValidationModes(
    getRecipients({}).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ clientId: "test", secret: "test" })),
    ),
    { body },
  );

describe("Plaid response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { recipients: [] };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("{}");
    expect(lenient).toMatchObject({ _tag: "Success", success: {} });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      PlaidParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(PlaidParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = { recipients: [], unmodeled: 1 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(PlaidParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      PlaidParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(PlaidParseError);
  });
});

// PlaidParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [PlaidParseError] extends [PlaidOpError]
  ? true
  : false = true;
