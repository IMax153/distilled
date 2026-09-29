import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiToken } from "./credentials.ts";
import { OktaParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getDRStatus } from "./services/okta.ts";
import type { OktaOpError } from "./protocol.ts";

// getDRStatus declares `{ status?: { domain?: string; isFailedOver?: boolean }[] }`.
// Its members are all optional, so the mismatch is a wrong primitive.
const run = (body: string) =>
  runValidationModes(
    getDRStatus({}).pipe(
      Retry.none,
      Effect.provide(
        fromApiToken({
          apiToken: "test",
          apiBaseUrl: "https://example.okta.com",
        }),
      ),
    ),
    { body },
  );

describe("Okta response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = {
      status: [{ domain: "example.okta.com", isFailedOver: false }],
    };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a member with the wrong primitive type: lenient returns it, validating modes fail", async () => {
    const body = {
      status: [{ domain: "example.okta.com", isFailedOver: "no" }],
    };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      OktaParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(OktaParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      status: [
        { domain: "example.okta.com", isFailedOver: false, unmodeled: 1 },
      ],
    };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(OktaParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      OktaParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(OktaParseError);
  });
});

// OktaParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [OktaParseError] extends [OktaOpError]
  ? true
  : false = true;
