import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromAccessToken } from "./credentials.ts";
import { MongodbAtlasParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getOrg } from "./services/atlas.ts";
import type { MongodbAtlasOpError } from "./protocol.ts";

// getOrg declares an organization with a required `name: string`.
const run = (body: string) =>
  runValidationModes(
    getOrg({ orgId: "org-1" }).pipe(
      Retry.none,
      Effect.provide(fromAccessToken({ accessToken: "test" })),
    ),
    { body },
  );

describe("MongoDB Atlas response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { id: "org-1", name: "Acme" };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("{}");
    expect(lenient).toMatchObject({ _tag: "Success", success: {} });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      MongodbAtlasParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(MongodbAtlasParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = { id: "org-1", name: "Acme", unmodeled: 1 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(MongodbAtlasParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      MongodbAtlasParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(MongodbAtlasParseError);
  });
});

// MongodbAtlasParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [MongodbAtlasParseError] extends [
  MongodbAtlasOpError,
]
  ? true
  : false = true;
