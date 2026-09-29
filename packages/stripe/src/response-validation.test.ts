import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { credentials } from "./credentials.ts";
import { StripeParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { GetBalance } from "./services/stripe.ts";
import type { StripeOpError } from "./protocol.ts";

// GetBalance declares `{ object; available; pending; livemode; … }`.
const run = (body: string) =>
  runValidationModes(
    GetBalance({}).pipe(
      Retry.none,
      Effect.provide(credentials({ apiKey: "sk_test_123" })),
    ),
    { body },
  );

describe("Stripe response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = {
      object: "balance",
      available: [],
      pending: [],
      livemode: false,
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
      StripeParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(StripeParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      object: "balance",
      available: [],
      pending: [],
      livemode: false,
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
    expect((strict as any).failure).toBeInstanceOf(StripeParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      StripeParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(StripeParseError);
  });
});

// StripeParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [StripeParseError] extends [StripeOpError]
  ? true
  : false = true;
