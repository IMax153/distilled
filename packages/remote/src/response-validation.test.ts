import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { RemoteParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getPayItems } from "./services/remote.ts";
import type { RemoteOpError } from "./protocol.ts";

// getPayItems declares `{ data: { current_page, data, total_count, total_pages } }`.
const run = (body: string) =>
  runValidationModes(
    getPayItems({}).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("Remote response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = {
      data: { current_page: 1, data: [], total_count: 0, total_pages: 0 },
    };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("{}");
    expect(lenient).toMatchObject({ _tag: "Success", success: {} });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      RemoteParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(RemoteParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      data: { current_page: 1, data: [], total_count: 0, total_pages: 0 },
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
    expect((strict as any).failure).toBeInstanceOf(RemoteParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      RemoteParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(RemoteParseError);
  });
});

// RemoteParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [RemoteParseError] extends [RemoteOpError]
  ? true
  : false = true;
