import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { credentials } from "./credentials.ts";
import { ModalParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { listEnvironment } from "./services/environment.ts";
import type { ModalOpError } from "./protocol.ts";

// listEnvironment declares `{ items?: EnvironmentListItem[] }`; every member is
// optional, so the mismatch is a wrong primitive (`items` must be an array).
const run = (body: string) =>
  runValidationModes(
    listEnvironment({}).pipe(
      Retry.none,
      Effect.provide(
        credentials({ tokenId: "ak-test", tokenSecret: "as-test" }),
      ),
    ),
    { body },
  );

describe("Modal response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { items: [{ name: "main", default: true }] };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body with a wrong primitive type: lenient returns it, validating modes fail", async () => {
    const body = { items: "main" };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      ModalParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(ModalParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = { items: [{ name: "main", default: true }], unmodeled: 1 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(ModalParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      ModalParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(ModalParseError);
  });
});

// ModalParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [ModalParseError] extends [ModalOpError]
  ? true
  : false = true;
