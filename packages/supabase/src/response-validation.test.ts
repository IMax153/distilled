import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { credentials } from "./credentials.ts";
import { SupabaseParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { v1GetProfile } from "./services/supabase.ts";
import type { SupabaseOpError } from "./protocol.ts";

// v1GetProfile declares `{ gotrue_id: string; primary_email: string; username: string }`.
const run = (body: string) =>
  runValidationModes(
    v1GetProfile({}).pipe(
      Retry.none,
      Effect.provide(credentials({ accessToken: "test" })),
    ),
    { body },
  );

describe("Supabase response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = {
      gotrue_id: "8f0e0a9c-1d2b-4c3d-9e4f-5a6b7c8d9e0f",
      primary_email: "dev@example.com",
      username: "dev",
    };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = { username: "dev" };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      SupabaseParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(SupabaseParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      gotrue_id: "8f0e0a9c-1d2b-4c3d-9e4f-5a6b7c8d9e0f",
      primary_email: "dev@example.com",
      username: "dev",
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
    expect((strict as any).failure).toBeInstanceOf(SupabaseParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      SupabaseParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(SupabaseParseError);
  });
});

// SupabaseParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [SupabaseParseError] extends [
  SupabaseOpError,
]
  ? true
  : false = true;
