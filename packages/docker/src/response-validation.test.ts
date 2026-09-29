import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { DockerParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { systemVersion2 } from "./services/docker.ts";
import type { DockerOpError } from "./protocol.ts";

// systemVersion2 declares `{ Platform?: { Name: string }; Version?: string; … }`.
const run = (body: string) =>
  runValidationModes(
    systemVersion2({}).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("Docker response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { Platform: { Name: "Docker Engine" }, Version: "27.0.0" };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = { Platform: {}, Version: "27.0.0" };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      DockerParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(DockerParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      Platform: { Name: "Docker Engine", unmodeled: 1 },
      Version: "27.0.0",
    };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(DockerParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      DockerParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(DockerParseError);
  });
});

// DockerParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [DockerParseError] extends [DockerOpError]
  ? true
  : false = true;
