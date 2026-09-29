import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { PorkbunParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getPing } from "./services/porkbun.ts";
import type { PorkbunOpError } from "./protocol.ts";

// getPing declares `{ status: string; yourIp: string; xForwardedFor?: string; credentialsValid?: boolean }`.
const run = (body: string) =>
  runValidationModes(
    getPing({}).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test", secretApiKey: "test" })),
    ),
    { body },
  );

describe("Porkbun response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { status: "SUCCESS", yourIp: "203.0.113.1" };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = { status: "SUCCESS" };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      PorkbunParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(PorkbunParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = { status: "SUCCESS", yourIp: "203.0.113.1", unmodeled: 1 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(PorkbunParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      PorkbunParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(PorkbunParseError);
  });
});

// PorkbunParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [PorkbunParseError] extends [PorkbunOpError]
  ? true
  : false = true;
