import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { credentials } from "./credentials.ts";
import { StackitParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { listKeyPairs } from "./services/iaas.ts";
import type { StackitOpError } from "./protocol.ts";

// listKeyPairs declares `{ items: Keypair[] }`.
const run = (body: string) =>
  runValidationModes(
    listKeyPairs({}).pipe(
      Retry.none,
      Effect.provide(credentials({ token: "test" })),
    ),
    { body },
  );

describe("STACKIT response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { items: [{ name: "key-1", publicKey: "ssh-ed25519 AAAA" }] };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("{}");
    expect(lenient).toMatchObject({ _tag: "Success", success: {} });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      StackitParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(StackitParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      items: [{ name: "key-1", publicKey: "ssh-ed25519 AAAA" }],
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
    expect((strict as any).failure).toBeInstanceOf(StackitParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      StackitParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(StackitParseError);
  });
});

// StackitParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [StackitParseError] extends [StackitOpError]
  ? true
  : false = true;
