import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { credentials } from "./credentials.ts";
import { DaytonaParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getSnapshotBuildLogsUrl } from "./services/snapshots.ts";
import type { DaytonaOpError } from "./protocol.ts";

// getSnapshotBuildLogsUrl declares `{ url: string }`.
const run = (body: string) =>
  runValidationModes(
    getSnapshotBuildLogsUrl({ id: "snap-1" }).pipe(
      Retry.none,
      Effect.provide(credentials({ apiKey: "test" })),
    ),
    { body },
  );

describe("Daytona response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { url: "https://logs.example/snap-1" };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("{}");
    expect(lenient).toMatchObject({ _tag: "Success", success: {} });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      DaytonaParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(DaytonaParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = { url: "https://logs.example/snap-1", unmodeled: 1 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(DaytonaParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      DaytonaParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(DaytonaParseError);
  });
});

// DaytonaParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [DaytonaParseError] extends [DaytonaOpError]
  ? true
  : false = true;
