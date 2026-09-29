import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import * as Endpoint from "./endpoint.ts";
import { CelldParseError } from "./errors.ts";
import { evictCell } from "./services/node.ts";
import type { CelldOpError } from "./protocol.ts";

// evictCell declares `{ ok: boolean }`.
const run = (body: string) =>
  runValidationModes(
    evictCell({ scope: "cell-a" }).pipe(
      Effect.provide(Endpoint.of("http://celld.test")),
    ),
    { body },
  );

describe("Celld response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { ok: true };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("{}");
    expect(lenient).toMatchObject({ _tag: "Success", success: {} });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      CelldParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(CelldParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = { ok: true, unmodeled: 1 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(CelldParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      CelldParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(CelldParseError);
  });
});

// CelldParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [CelldParseError] extends [CelldOpError]
  ? true
  : false = true;
