import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiToken } from "./credentials.ts";
import { PrismaParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getDatabaseUsage } from "./services/management.ts";
import type { PrismaOpError } from "./protocol.ts";

// getDatabaseUsage declares `{ period: { start; end }; metrics: { … }; generatedAt: string }`.
const run = (body: string) =>
  runValidationModes(
    getDatabaseUsage({ databaseId: "db_1" }).pipe(
      Retry.none,
      Effect.provide(fromApiToken({ apiToken: "test" })),
    ),
    { body },
  );

describe("Prisma response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = {
      period: { start: "2026-09-01", end: "2026-09-29" },
      metrics: {
        operations: { used: 10, unit: "ops" },
        storage: { used: 1, unit: "GiB" },
      },
      generatedAt: "2026-09-29T00:00:00Z",
    };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = {};
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      PrismaParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(PrismaParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      period: { start: "2026-09-01", end: "2026-09-29" },
      metrics: {
        operations: { used: 10, unit: "ops" },
        storage: { used: 1, unit: "GiB" },
      },
      generatedAt: "2026-09-29T00:00:00Z",
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
    expect((strict as any).failure).toBeInstanceOf(PrismaParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      PrismaParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(PrismaParseError);
  });
});

// PrismaParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [PrismaParseError] extends [PrismaOpError]
  ? true
  : false = true;
