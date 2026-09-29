import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { credentials } from "./credentials.ts";
import { DiscordParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getGateway } from "./services/discord.ts";
import type { DiscordOpError } from "./protocol.ts";

// getGateway declares `{ url: string }`.
const run = (body: string) =>
  runValidationModes(
    getGateway({}).pipe(
      Retry.none,
      Effect.provide(credentials({ token: "test" })),
    ),
    { body },
  );

describe("Discord response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { url: "wss://gateway.discord.gg" };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("{}");
    expect(lenient).toMatchObject({ _tag: "Success", success: {} });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      DiscordParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(DiscordParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = { url: "wss://gateway.discord.gg", unmodeled: 1 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(DiscordParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      DiscordParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(DiscordParseError);
  });
});

// DiscordParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [DiscordParseError] extends [DiscordOpError]
  ? true
  : false = true;
