import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromToken } from "./credentials.ts";
import { ArgocdParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { versionServiceVersion } from "./services/argocd.ts";
import type { ArgocdOpError } from "./protocol.ts";

// versionServiceVersion declares `{ Version?: string; ... }` (all optional).
const run = (body: string) =>
  runValidationModes(
    versionServiceVersion({}).pipe(
      Retry.none,
      Effect.provide(fromToken({ token: "test" })),
    ),
    { body },
  );

describe("Argo CD response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { Version: "v2.13.0", Platform: "linux/amd64" };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a member with the wrong type: lenient returns it, validating modes fail", async () => {
    const body = { Version: 2 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      ArgocdParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(ArgocdParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = { Version: "v2.13.0", Platform: "linux/amd64", unmodeled: 1 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(ArgocdParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      ArgocdParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(ArgocdParseError);
  });
});

// ArgocdParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [ArgocdParseError] extends [ArgocdOpError]
  ? true
  : false = true;
