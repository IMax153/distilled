import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { credentials } from "./credentials.ts";
import { GithubParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getTemplate } from "./services/gitignore.ts";
import type { GithubOpError } from "./protocol.ts";

// getTemplate declares `{ name: string; source: string }`.
const run = (body: string) =>
  runValidationModes(
    getTemplate({ name: "Node" }).pipe(
      Retry.none,
      Effect.provide(credentials({ token: "test" })),
    ),
    { body },
  );

describe("Github response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { name: "Node", source: "node_modules/\\n" };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = { name: "Node" };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      GithubParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(GithubParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = { name: "Node", source: "node_modules/\\n", unmodeled: 1 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(GithubParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      GithubParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(GithubParseError);
  });
});

// GithubParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [GithubParseError] extends [GithubOpError]
  ? true
  : false = true;
