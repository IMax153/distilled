import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { TriggerDevParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getQueueV1 } from "./services/trigger-dev.ts";
import type { TriggerDevOpError } from "./protocol.ts";

// getQueueV1 declares QueueObject: `{ id; name; type; running; queued; paused; … }`.
const run = (body: string) =>
  runValidationModes(
    getQueueV1({ queueParam: "default" }).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("Trigger.dev response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = {
      id: "queue_1",
      name: "default",
      type: "task",
      running: 0,
      queued: 0,
      paused: false,
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
      TriggerDevParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(TriggerDevParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      id: "queue_1",
      name: "default",
      type: "task",
      running: 0,
      queued: 0,
      paused: false,
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
    expect((strict as any).failure).toBeInstanceOf(TriggerDevParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      TriggerDevParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(TriggerDevParseError);
  });
});

// TriggerDevParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [TriggerDevParseError] extends [
  TriggerDevOpError,
]
  ? true
  : false = true;
