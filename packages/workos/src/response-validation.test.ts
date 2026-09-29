import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { credentials } from "./credentials.ts";
import { WorkosParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { ApplicationsControllerFind } from "./services/workos.ts";
import type { WorkosOpError } from "./protocol.ts";

// ApplicationsControllerFind declares required `object`, `id`, `client_id`, `description`, `name`, `scopes`, `created_at`, `updated_at`.
const run = (body: string) =>
  runValidationModes(
    ApplicationsControllerFind({ id: "app_1" }).pipe(
      Retry.none,
      Effect.provide(credentials({ apiKey: "test" })),
    ),
    { body },
  );

describe("WorkOS response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = {
      object: "connect_application",
      id: "app_1",
      client_id: "client_1",
      description: null,
      name: "My App",
      scopes: ["openid"],
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
    };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = { object: "connect_application", id: "app_1" };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      WorkosParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(WorkosParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      object: "connect_application",
      id: "app_1",
      client_id: "client_1",
      description: null,
      name: "My App",
      scopes: ["openid"],
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
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
    expect((strict as any).failure).toBeInstanceOf(WorkosParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      WorkosParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(WorkosParseError);
  });
});

// WorkosParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [WorkosParseError] extends [WorkosOpError]
  ? true
  : false = true;
