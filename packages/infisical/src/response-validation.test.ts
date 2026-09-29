import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { InfisicalParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getPkiDiscoveryConfig } from "./services/infisical.ts";
import type { InfisicalOpError } from "./protocol.ts";

// getPkiDiscoveryConfig declares required `defaultPorts`, `maxPorts`,
// `maxIps`, `maxDomains`, and `minCidrPrefix`.
const run = (body: string) =>
  runValidationModes(
    getPkiDiscoveryConfig({}).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

const matching = {
  defaultPorts: "443",
  maxPorts: 10,
  maxIps: 256,
  maxDomains: 100,
  minCidrPrefix: 24,
};

describe("Infisical response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const modes = await run(JSON.stringify(matching));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: matching });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = { defaultPorts: "443" };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      InfisicalParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(InfisicalParseError);
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
    expect((strict as any).failure).toBeInstanceOf(InfisicalParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      InfisicalParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(InfisicalParseError);
  });
});

// InfisicalParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [InfisicalParseError] extends [
  InfisicalOpError,
]
  ? true
  : false = true;
