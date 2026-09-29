import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { credentials } from "./credentials.ts";
import { HuggingFaceParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getJobHardware } from "./services/jobs.ts";
import type { HuggingFaceOpError } from "./protocol.ts";

// getJobHardware declares `Array<{ name: string; prettyName: string; cpu: string; … }>`.
const run = (body: string) =>
  runValidationModes(
    getJobHardware({}).pipe(
      Retry.none,
      Effect.provide(credentials({ token: "test" })),
    ),
    { body },
  );

describe("HuggingFace response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = [
      {
        name: "cpu-basic",
        prettyName: "CPU Basic",
        cpu: "2 vCPU",
        ram: "16 GB",
        ephemeralStorage: "50 GB",
        accelerator: null,
        unitCostMicroUSD: 167,
        unitCostUSD: 0.000167,
        unitLabel: "second",
      },
    ];
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = [{ name: "cpu-basic" }];
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      HuggingFaceParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(HuggingFaceParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = [
      {
        name: "cpu-basic",
        prettyName: "CPU Basic",
        cpu: "2 vCPU",
        ram: "16 GB",
        ephemeralStorage: "50 GB",
        accelerator: null,
        unitCostMicroUSD: 167,
        unitCostUSD: 0.000167,
        unitLabel: "second",
        unmodeled: 1,
      },
    ];
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(HuggingFaceParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      HuggingFaceParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(HuggingFaceParseError);
  });
});

// HuggingFaceParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [HuggingFaceParseError] extends [
  HuggingFaceOpError,
]
  ? true
  : false = true;
