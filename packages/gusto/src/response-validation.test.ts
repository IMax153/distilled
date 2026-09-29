import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { GustoParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getCompanies } from "./services/gusto.ts";
import type { GustoOpError } from "./protocol.ts";

// getCompanies declares a Company with a required `uuid: string`.
const run = (body: string) =>
  runValidationModes(
    getCompanies({ company_id: "c-1" }).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("Gusto response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { uuid: "c-1", name: "Acme" };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("{}");
    expect(lenient).toMatchObject({ _tag: "Success", success: {} });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      GustoParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(GustoParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = { uuid: "c-1", name: "Acme", unmodeled: 1 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(GustoParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      GustoParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(GustoParseError);
  });
});

// GustoParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [GustoParseError] extends [GustoOpError]
  ? true
  : false = true;
