import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { IntercomParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { jobsStatus2 } from "./services/intercom.ts";
import type { IntercomOpError } from "./protocol.ts";

// jobsStatus2 declares `Jobs`, whose `id: string` is required.
const run = (body: string) =>
  runValidationModes(
    jobsStatus2({ job_id: "job_1" }).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("Intercom response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { type: "job", id: "job_1", status: "success" };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = { type: "job", status: "success" };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      IntercomParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(IntercomParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = { type: "job", id: "job_1", status: "success", unmodeled: 1 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(IntercomParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      IntercomParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(IntercomParseError);
  });
});

// IntercomParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [IntercomParseError] extends [
  IntercomOpError,
]
  ? true
  : false = true;
