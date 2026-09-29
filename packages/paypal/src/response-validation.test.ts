import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { PaypalParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getWebProfile } from "./services/payment_experience_web_experience_profiles_v1.ts";
import type { PaypalOpError } from "./protocol.ts";

// getWebProfile declares `WebProfile`, whose `name: string` is required.
const run = (body: string) =>
  runValidationModes(
    getWebProfile({ id: "XP-1" }).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("PayPal response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { id: "XP-1", name: "checkout", temporary: false };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = { id: "XP-1", temporary: false };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      PaypalParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(PaypalParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      id: "XP-1",
      name: "checkout",
      temporary: false,
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
    expect((strict as any).failure).toBeInstanceOf(PaypalParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      PaypalParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(PaypalParseError);
  });
});

// PaypalParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [PaypalParseError] extends [PaypalOpError]
  ? true
  : false = true;
