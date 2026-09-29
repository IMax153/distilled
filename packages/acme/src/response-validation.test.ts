import { beforeEach, describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import { layer } from "./credentials.ts";
import { AcmeParseError } from "./errors.ts";
import { resetProtocolCaches } from "./protocol.ts";
import * as Retry from "./retry.ts";
import { getDirectory } from "./services/acme.ts";
import type { AcmeOpError } from "./protocol.ts";

const DIRECTORY_URL = "https://acme.test/directory";

// getDirectory is a plain GET of the directory URL: no nonce, no signing.
const TestCredentials = layer({
  directoryUrl: DIRECTORY_URL,
  accountKey: Redacted.make("{}"),
});

// getDirectory declares `{ newNonce: string; newAccount: string; newOrder: string; revokeCert: string; … }`.
const run = (body: string, headers?: Record<string, string>) =>
  runValidationModes(
    getDirectory({}).pipe(Retry.none, Effect.provide(TestCredentials)),
    (request) => {
      if (request.url !== DIRECTORY_URL) {
        throw new Error(`unexpected request to ${request.url}`);
      }
      return { body, headers };
    },
  );

beforeEach(() => resetProtocolCaches());

describe("ACME response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = {
      newNonce: "https://acme.test/new-nonce",
      newAccount: "https://acme.test/new-account",
      newOrder: "https://acme.test/new-order",
      revokeCert: "https://acme.test/revoke-cert",
    };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = { newNonce: "https://acme.test/new-nonce" };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      AcmeParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(AcmeParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      newNonce: "https://acme.test/new-nonce",
      newAccount: "https://acme.test/new-account",
      newOrder: "https://acme.test/new-order",
      revokeCert: "https://acme.test/revoke-cert",
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
    expect((strict as any).failure).toBeInstanceOf(AcmeParseError);
  });

  test("a Location header on an output without `location` is not an unmodeled member", async () => {
    const body = {
      newNonce: "https://acme.test/new-nonce",
      newAccount: "https://acme.test/new-account",
      newOrder: "https://acme.test/new-order",
      revokeCert: "https://acme.test/revoke-cert",
    };
    const modes = await run(JSON.stringify(body), {
      "content-type": "application/json",
      location: "https://acme.test/elsewhere",
    });
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      AcmeParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(AcmeParseError);
  });
});

// AcmeParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [AcmeParseError] extends [AcmeOpError]
  ? true
  : false = true;
