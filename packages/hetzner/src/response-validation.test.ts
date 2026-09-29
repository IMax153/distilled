import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { credentials } from "./credentials.ts";
import { HetznerParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { listLocations } from "./services/locations.ts";
import type { HetznerOpError } from "./protocol.ts";

// listLocations declares `{ locations: Location[]; meta: { pagination } }`.
const run = (body: string) =>
  runValidationModes(
    listLocations({}).pipe(
      Retry.none,
      Effect.provide(credentials({ token: "test" })),
    ),
    { body },
  );

describe("Hetzner response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = {
      locations: [],
      meta: {
        pagination: {
          page: 1,
          per_page: 25,
          previous_page: null,
          next_page: null,
          last_page: 1,
          total_entries: 0,
        },
      },
    };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("{}");
    expect(lenient).toMatchObject({ _tag: "Success", success: {} });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      HetznerParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(HetznerParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      locations: [],
      meta: {
        pagination: {
          page: 1,
          per_page: 25,
          previous_page: null,
          next_page: null,
          last_page: 1,
          total_entries: 0,
        },
      },
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
    expect((strict as any).failure).toBeInstanceOf(HetznerParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      HetznerParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(HetznerParseError);
  });
});

// HetznerParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [HetznerParseError] extends [HetznerOpError]
  ? true
  : false = true;
