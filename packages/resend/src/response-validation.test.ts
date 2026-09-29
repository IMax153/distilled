import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { ResendParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { listApiKeys } from "./services/resend.ts";
import type { ResendOpError } from "./protocol.ts";

// listApiKeys declares `{ object?: string; has_more?: boolean; data: ApiKey[] }`.
const run = (body: string) =>
  runValidationModes(
    listApiKeys({}).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("Resend response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = {
      object: "list",
      has_more: false,
      data: [
        {
          id: "b6d24b8e-af0b-4c3c-be0c-359bbd97381e",
          name: "Production",
          created_at: "2023-04-08T00:11:13.110779+00:00",
          last_used_at: null,
        },
      ],
    };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = { object: "list", has_more: false };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      ResendParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(ResendParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = { object: "list", has_more: false, data: [], unmodeled: 1 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(ResendParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      ResendParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(ResendParseError);
  });
});

// ResendParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [ResendParseError] extends [ResendOpError]
  ? true
  : false = true;
