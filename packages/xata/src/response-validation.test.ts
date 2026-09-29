import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { XataParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { listRegions } from "./services/xata.ts";
import type { XataOpError } from "./protocol.ts";

// listRegions declares `{ regions: Region[] }`.
const run = (body: string) =>
  runValidationModes(
    listRegions({ organizationID: "org-1" }).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("Xata response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { regions: [] };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("{}");
    expect(lenient).toMatchObject({ _tag: "Success", success: {} });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      XataParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(XataParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = { regions: [], unmodeled: 1 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(XataParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      XataParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(XataParseError);
  });
});

// XataParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [XataParseError] extends [XataOpError]
  ? true
  : false = true;
