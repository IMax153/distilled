import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { UnkeyParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { apisGetApi } from "./services/unkey.ts";
import type { UnkeyOpError } from "./protocol.ts";

// apisGetApi declares `{ meta: { requestId: string }; data: { id: string; name: string } }`;
// Unkey success bodies keep their `{ meta, data }` envelope.
const run = (body: string) =>
  runValidationModes(
    apisGetApi({ apiId: "api_123" }).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("Unkey response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = {
      meta: { requestId: "req_123" },
      data: { id: "api_123", name: "payment-service-production" },
    };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = { meta: { requestId: "req_123" }, data: { id: "api_123" } };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      UnkeyParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(UnkeyParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      meta: { requestId: "req_123" },
      data: { id: "api_123", name: "payment-service-production", unmodeled: 1 },
    };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(UnkeyParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      UnkeyParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(UnkeyParseError);
  });
});

// UnkeyParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [UnkeyParseError] extends [UnkeyOpError]
  ? true
  : false = true;
