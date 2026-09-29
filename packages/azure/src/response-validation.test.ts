import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import { Credentials, DEFAULT_API_BASE_URL } from "./credentials.ts";
import { AzureParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { ListServiceBySubscription } from "./services/apicenter.ts";
import type { AzureOpError } from "./protocol.ts";

const TestCredentials = Layer.succeed(
  Credentials,
  Effect.succeed({
    bearerToken: Redacted.make("test"),
    subscriptionId: "00000000-0000-0000-0000-000000000000",
    apiBaseUrl: DEFAULT_API_BASE_URL,
  }),
);

// ListServiceBySubscription declares `{ value: Service[]; nextLink?: string }`.
const run = (body: string) =>
  runValidationModes(
    ListServiceBySubscription({
      subscriptionId: "00000000-0000-0000-0000-000000000000",
    }).pipe(Retry.none, Effect.provide(TestCredentials)),
    { body },
  );

const matching = { value: [{ location: "westus", name: "svc" }] };

describe("Azure response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const modes = await run(JSON.stringify(matching));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: matching });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = { nextLink: "https://management.azure.com/next" };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      AzureParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(AzureParseError);
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
    expect((strict as any).failure).toBeInstanceOf(AzureParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      AzureParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(AzureParseError);
  });
});

// AzureParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [AzureParseError] extends [AzureOpError]
  ? true
  : false = true;
