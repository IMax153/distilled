import { describe, expect, test } from "bun:test";
import { runValidationModes } from "@distilled.cloud/core/testing";
import * as Effect from "effect/Effect";
import { fromApiKey } from "./credentials.ts";
import { ElasticsearchParseError } from "./errors.ts";
import * as Retry from "./retry.ts";
import { licenseGetBasicStatus } from "./services/elasticsearch.ts";
import type { ElasticsearchOpError } from "./protocol.ts";

// licenseGetBasicStatus declares `{ eligible_to_start_basic: boolean }`.
const run = (body: string) =>
  runValidationModes(
    licenseGetBasicStatus({}).pipe(
      Retry.none,
      Effect.provide(fromApiKey({ apiKey: "test" })),
    ),
    { body },
  );

describe("Elasticsearch response validation", () => {
  test("a matching body succeeds unchanged in every mode", async () => {
    const body = { eligible_to_start_basic: true };
    const modes = await run(JSON.stringify(body));
    for (const result of Object.values(modes)) {
      expect(result).toMatchObject({ _tag: "Success", success: body });
    }
  });

  test("a body missing required members: lenient returns it, validating modes fail", async () => {
    const body = {};
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      ElasticsearchParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(ElasticsearchParseError);
  });

  test("an unmodeled member: lenient and additionalProperties return it, strict fails", async () => {
    const body = { eligible_to_start_basic: true, unmodeled: 1 };
    const { lenient, additionalProperties, strict } = await run(
      JSON.stringify(body),
    );
    expect(lenient).toMatchObject({ _tag: "Success", success: body });
    expect(additionalProperties).toMatchObject({
      _tag: "Success",
      success: body,
    });
    expect((strict as any).failure).toBeInstanceOf(ElasticsearchParseError);
  });

  test("a non-JSON body: lenient returns the text, validating modes fail", async () => {
    const { lenient, additionalProperties, strict } = await run("not json");
    expect(lenient).toMatchObject({ _tag: "Success", success: "not json" });
    expect((additionalProperties as any).failure).toBeInstanceOf(
      ElasticsearchParseError,
    );
    expect((strict as any).failure).toBeInstanceOf(ElasticsearchParseError);
  });
});

// ElasticsearchParseError is part of every operation's declared error type.
export const parseErrorIsDeclared: [ElasticsearchParseError] extends [
  ElasticsearchOpError,
]
  ? true
  : false = true;
