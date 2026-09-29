import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { credentials } from "./credentials.ts";
import { VercelParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { listAiGatewayRules } from "./services/ai_gateway.ts";
import type { VercelOpError } from "./protocol.ts";

// listAiGatewayRules declares `{ rules: AiGatewayRule[] }`.
const run = (body: string) =>
  runValidationModes(
    listAiGatewayRules({}).pipe(
      Retry.none,
      Effect.provide(credentials({ token: "test" })),
    ),
    { body },
  );

const matching = { rules: [] };

describe("Vercel response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const modes = await run(JSON.stringify(matching));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: matching });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = {};
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      VercelParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(VercelParseError);
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
    expect((strict as any).failure).toBeInstanceOf(VercelParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      VercelParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(VercelParseError);
  });
});

// VercelParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [VercelParseError] extends [VercelOpError]
  ? true
  : false = true;
