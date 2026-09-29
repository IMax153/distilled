import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { RedisCloudParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getAccountPaymentMethods } from "./services/redisCloud.ts";
import type { RedisCloudOpError } from "./protocol.ts";

// getAccountPaymentMethods declares `{ accountId?: number; links?: ... }` (every member optional).
const run = (body: string) =>
  runValidationModes(
    getAccountPaymentMethods({}).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test", apiSecretKey: "test" })),
    ),
    { body },
  );

describe("Redis Cloud response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = {
      accountId: 42,
      links: [
        { rel: "self", href: "https://api.redislabs.com/v1/payment-methods" },
      ],
    };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body with a wrong primitive type: lenient returns it, validating modes fail", async () => {
    const body = { accountId: "42" };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      RedisCloudParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(RedisCloudParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      accountId: 42,
      links: [
        { rel: "self", href: "https://api.redislabs.com/v1/payment-methods" },
      ],
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
    expect((strict as any).failure).toBeInstanceOf(RedisCloudParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      RedisCloudParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(RedisCloudParseError);
  });
});

// RedisCloudParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [RedisCloudParseError] extends [
  RedisCloudOpError,
]
  ? true
  : false = true;
