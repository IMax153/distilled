import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { OvhParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getIamPermissionsGroup } from "./services/iam.ts";
import type { OvhOpError } from "./protocol.ts";

// getIamPermissionsGroup declares `{ description: string; name: string; permissions: { … }; … }`.
const run = (body: string) =>
  runValidationModes(
    getIamPermissionsGroup({
      permissionsGroupURN: "urn:v1:eu:permissionsGroup:test",
    }).pipe(Retry.none, Effect.provide(fromApiKey({ apiKey: "test" }))),
    { body },
  );

describe("OVH response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = {
      name: "readers",
      description: "read only",
      permissions: { allow: [] },
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
    expect((additionalProperties as any).failure).toBeInstanceOf(OvhParseError);
    expect((strict as any).failure).toBeInstanceOf(OvhParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      name: "readers",
      description: "read only",
      permissions: { allow: [] },
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
    expect((strict as any).failure).toBeInstanceOf(OvhParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(OvhParseError);
    expect((strict as any).failure).toBeInstanceOf(OvhParseError);
  });
});

// OvhParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [OvhParseError] extends [OvhOpError]
  ? true
  : false = true;
