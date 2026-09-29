import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { HostingerParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getVPSPublicKeysV1 } from "./services/hostinger.ts";
import type { HostingerOpError } from "./protocol.ts";

// getVPSPublicKeysV1 declares `{ data?: { id?: number; name?: string; key?: string }[]; meta?: ... }`.
// Every Hostinger output member is optional, so the mismatch is a wrong primitive.
const run = (body: string) =>
  runValidationModes(
    getVPSPublicKeysV1({}).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("Hostinger response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { data: [{ id: 1, name: "laptop", key: "ssh-ed25519 AAAA" }] };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a member with the wrong primitive type: lenient returns it, validating modes fail", async () => {
    const body = { data: [{ id: "one", name: "laptop" }] };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      HostingerParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(HostingerParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      data: [{ id: 1, name: "laptop", key: "ssh-ed25519 AAAA", unmodeled: 1 }],
    };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(HostingerParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      HostingerParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(HostingerParseError);
  });
});

// HostingerParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [HostingerParseError] extends [
  HostingerOpError,
]
  ? true
  : false = true;
