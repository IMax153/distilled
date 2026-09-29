import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { AdyenParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getPaymentLink } from "./services/adyen.ts";
import type { AdyenOpError } from "./protocol.ts";

// getPaymentLink declares required `amount`, `id`, `merchantAccount`,
// `reference`, `status`, and `url`.
const run = (body: string) =>
  runValidationModes(
    getPaymentLink({ linkId: "PL123" }).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

const matching = {
  amount: { currency: "EUR", value: 1000 },
  id: "PL123",
  merchantAccount: "TestMerchant",
  reference: "order-1",
  status: "active",
  url: "https://test.adyen.link/PL123",
};

describe("Adyen response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const modes = await run(JSON.stringify(matching));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: matching });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = { id: "PL123" };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      AdyenParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(AdyenParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = { ...matching, unmodeled: 1 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(AdyenParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      AdyenParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(AdyenParseError);
  });
});

// AdyenParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [AdyenParseError] extends [AdyenOpError]
  ? true
  : false = true;
