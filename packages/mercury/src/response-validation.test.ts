import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { MercuryParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { getOrganization } from "./services/mercury.ts";
import type { MercuryOpError } from "./protocol.ts";

// getOrganization declares `{ organization: { dbas: OrganizationDBA[]; legalBusinessName: string; … } }`.
const run = (body: string) =>
  runValidationModes(
    getOrganization({}).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("Mercury response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = {
      organization: {
        billingCadence: "monthly",
        dbas: [{ dbaIsDefault: true, dbaName: "Acme" }],
        id: "org_1",
        kind: "business",
        legalBusinessName: "Acme Inc.",
        subscriptionTier: "free",
      },
    };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = { organization: { id: "org_1", dbas: [] } };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      MercuryParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(MercuryParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = {
      organization: {
        billingCadence: "monthly",
        dbas: [{ dbaIsDefault: true, dbaName: "Acme" }],
        id: "org_1",
        kind: "business",
        legalBusinessName: "Acme Inc.",
        subscriptionTier: "free",
        unmodeled: 1,
      },
    };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(MercuryParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      MercuryParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(MercuryParseError);
  });
});

// MercuryParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [MercuryParseError] extends [MercuryOpError]
  ? true
  : false = true;
