import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { ChronosphereParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { listTeams } from "./services/chronosphere.ts";
import type { ChronosphereOpError } from "./protocol.ts";

// listTeams declares `{ teams: Team[]; page?: ... }`.
const run = (body: string) =>
  runValidationModes(
    listTeams({}).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test", apiBaseUrl: "example" })),
    ),
    { body },
  );

describe("Chronosphere response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { teams: [{ slug: "platform", name: "Platform" }] };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("{}");
    expect(lenient).toMatchObject({ _tag: "Success", success: {} });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      ChronosphereParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(ChronosphereParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      teams: [{ slug: "platform", name: "Platform" }],
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
    expect((strict as any).failure).toBeInstanceOf(ChronosphereParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      ChronosphereParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(ChronosphereParseError);
  });
});

// ChronosphereParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [ChronosphereParseError] extends [
  ChronosphereOpError,
]
  ? true
  : false = true;
