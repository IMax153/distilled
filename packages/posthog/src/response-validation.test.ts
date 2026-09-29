import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { credentials } from "./credentials.ts";
import { PosthogParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getAccountRelationshipDefinition } from "./services/account_relationship_definitions.ts";
import type { PosthogOpError } from "./protocol.ts";

// getAccountRelationshipDefinition declares required `id` and `name`.
const run = (body: string) =>
  runValidationModes(
    getAccountRelationshipDefinition({ project_id: "1", id: "rel-1" }).pipe(
      Retry.none,
      Effect.provide(credentials({ apiKey: "phx_test" })),
    ),
    { body },
  );

const matching = { id: "rel-1", name: "owner", is_single_holder: true };

describe("PostHog response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const modes = await run(JSON.stringify(matching));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: matching });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = { id: "rel-1" };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      PosthogParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(PosthogParseError);
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
    expect((strict as any).failure).toBeInstanceOf(PosthogParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      PosthogParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(PosthogParseError);
  });
});

// PosthogParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [PosthogParseError] extends [PosthogOpError]
  ? true
  : false = true;
