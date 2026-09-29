import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromCredentials } from "./credentials.ts";
import { type CommonErrors, ParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { describeEndpoints } from "./services/dynamodb.ts";

// DynamoDB (awsJson1_0) describeEndpoints declares
// `{ Endpoints: { Address: string; CachePeriodInMinutes: number }[] }`.
const run = (body: string) =>
  runValidationModes(
    describeEndpoints({}).pipe(
      Retry.none,
      Effect.provide(
        fromCredentials(
          { accessKeyId: "AKIDTEST", secretAccessKey: "secret" },
          "us-east-1",
        ),
      ),
    ),
    { body, headers: { "content-type": "application/x-amz-json-1.0" } },
  );

describe("AWS response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = {
      Endpoints: [
        {
          Address: "dynamodb.us-east-1.amazonaws.com",
          CachePeriodInMinutes: 1440,
        },
      ],
    };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = {
      Endpoints: [{ Address: "dynamodb.us-east-1.amazonaws.com" }],
    };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(ParseError);
    expect((strict as any).failure).toBeInstanceOf(ParseError);
  });

  test("an unmodeled member: lenient and additionalProperties succeed, strict fails", async () => {
    const endpoint = {
      Address: "dynamodb.us-east-1.amazonaws.com",
      CachePeriodInMinutes: 1440,
    };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify({ Endpoints: [{ ...endpoint, unmodeled: 1 }] }),
    );
    // AWS returns the schema-decoded output, which never carries unmodeled
    // members (in any mode), so they are dropped rather than returned.
    for (const result of [lenient, additionalProperties]) {
      expect(result).toMatchObject({
        _tag: "Success",
        success: { Endpoints: [endpoint] },
      });
      expect((result as any).success.Endpoints[0]).not.toHaveProperty(
        "unmodeled",
      );
    }
    expect((strict as any).failure).toBeInstanceOf(ParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(ParseError);
    expect((strict as any).failure).toBeInstanceOf(ParseError);
  });
});

// ParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [ParseError] extends [CommonErrors]
  ? true
  : false = true;
