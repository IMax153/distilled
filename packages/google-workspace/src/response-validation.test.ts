import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromAccessToken } from "./credentials.ts";
import { GoogleWorkspaceParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getStartPageTokenChanges } from "./services/drive_v3.ts";
import type { GoogleWorkspaceOpError } from "./protocol.ts";

// Discovery schemas mark every member optional; getStartPageTokenChanges
// declares `{ startPageToken?: string; kind?: string }`, so the mismatch is a
// wrong primitive type.
const run = (body: string) =>
  runValidationModes(
    getStartPageTokenChanges({}).pipe(
      Retry.none,
      Effect.provide(fromAccessToken({ accessToken: "test" })),
    ),
    { body },
  );

const matching = { kind: "drive#startPageToken", startPageToken: "123" };

describe("Google Workspace response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const modes = await run(JSON.stringify(matching));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: matching });
    }
  });

  test("a member with the wrong primitive type: lenient returns it, validating modes fail", async () => {
    const body = { kind: "drive#startPageToken", startPageToken: 123 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      GoogleWorkspaceParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(GoogleWorkspaceParseError);
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
    expect((strict as any).failure).toBeInstanceOf(GoogleWorkspaceParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      GoogleWorkspaceParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(GoogleWorkspaceParseError);
  });
});

// GoogleWorkspaceParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [GoogleWorkspaceParseError] extends [
  GoogleWorkspaceOpError,
]
  ? true
  : false = true;
