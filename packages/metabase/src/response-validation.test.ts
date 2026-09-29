import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import * as Retry from "./retry.ts";
import { getAction } from "./services/metabase.ts";
import type { MetabaseParseError } from "./errors.ts";
import type { MetabaseOpError } from "./protocol.ts";

// Metabase's OpenAPI declares no response bodies, so every generated output
// schema is `S.Struct({})`. Effect reads that as the `{}` type, which accepts
// any non-nullish value (a JSON `null` body is read as `{}`) and has no
// members to call excess, so no mode has anything to reject: these tests pin
// that every mode returns every 2xx body unchanged.
const run = (body: string) =>
  runValidationModes(
    getAction({}).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("Metabase response validation", () => {
  test("an empty object body succeeds unchanged in every mode", async () => {
    const modes = await run("{}");
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: {} });
    }
  });

  test("a non-object JSON body passes the empty output schema in every mode", async () => {
    const body = [{ id: 1, name: "action" }];
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  // `S.Struct({})` is `{}`, not a closed struct: strict has no modeled
  // members to compare against, so unmodeled members pass in every mode.
  test("unmodeled members pass the empty output schema in every mode", async () => {
    const body = { id: 1, name: "action", unmodeled: 1 };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a non-JSON body: every mode returns the text", async () => {
    const modes = await run("not json");
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: "not json" });
    }
  });
});

// MetabaseParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [MetabaseParseError] extends [
  MetabaseOpError,
]
  ? true
  : false = true;
