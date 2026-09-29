import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import * as ResponseValidation from "@distilled.cloud/core/response-validation";
import { isTransientError } from "../category.ts";
import { InternalError, ParseError } from "../errors.ts";
import { PutObjectRequest, PutObjectOutput, SlowDown } from "../services/s3.ts";
import {
  CreateFunctionRequest,
  FunctionConfiguration,
  InvalidParameterValueException,
  LambdaInternalKmsError,
  UpdateFunctionCodeRequest,
} from "../services/lambda.ts";
import { makeResponseParser } from "./response-parser.ts";

const parseCreateFunction = makeResponseParser({
  input: CreateFunctionRequest,
  output: FunctionConfiguration,
  errors: [InvalidParameterValueException, LambdaInternalKmsError],
});

const invalidParameterResponse = (message: string) => ({
  status: 400,
  statusText: "Bad Request",
  headers: {
    "content-type": "application/json",
    "x-amzn-errortype": "InvalidParameterValueException",
  },
  body: JSON.stringify({ Type: "User", message }),
});

const parsePutObject = makeResponseParser({
  input: PutObjectRequest,
  output: PutObjectOutput,
  errors: [SlowDown],
});

const unstructuredBodies = [
  ["HTML", "<html><body>SENSITIVE_SENTINEL</body></html>"],
  [
    "HTML doctype",
    "<!doctype html><html><body>SENSITIVE_SENTINEL</body></html>",
  ],
  ["JSON", '{"message":"SENSITIVE_SENTINEL"}'],
  ["text", "SENSITIVE_SENTINEL"],
  ["XML without code", "<Error><Message>SENSITIVE_SENTINEL</Message></Error>"],
  ["malformed XML", "<Error><Message>SENSITIVE_SENTINEL"],
  ["empty", ""],
] as const;

describe("REST-XML unstructured server errors", () => {
  for (const status of [500, 502, 503, 504]) {
    for (const [name, body] of unstructuredBodies) {
      test(`${status} ${name} is retryable without retaining the response body`, async () => {
        const error = await Effect.runPromise(
          parsePutObject({
            status,
            statusText: "Server Error",
            headers: {},
            body,
          }).pipe(Effect.flip),
        );
        if (status === 503 && !body) {
          expect(error).toMatchObject({ _tag: "ServiceUnavailable" });
        } else {
          expect(error).toBeInstanceOf(InternalError);
        }
        expect(isTransientError(error)).toBe(true);
        expect(JSON.stringify(error)).not.toContain("SENSITIVE_SENTINEL");
      });
    }
  }

  for (const [name, body] of unstructuredBodies.filter(
    ([, body]) => body !== "",
  )) {
    test(`malformed 400 ${name} remains a parse error`, async () => {
      const error = await Effect.runPromise(
        parsePutObject({
          status: 400,
          statusText: "Bad Request",
          headers: {},
          body,
        }).pipe(Effect.flip),
      );
      expect(error).toBeInstanceOf(ParseError);
      expect(isTransientError(error)).toBe(false);
    });
  }

  for (const body of [
    "<Error><Code>SlowDown</Code><Message>Try later</Message></Error>",
    "<html><body><li>Code: SlowDown</li><li>Message: Try later</li></body></html>",
  ]) {
    test(`preserves recognized ${body.startsWith("<html") ? "HTML" : "XML"} server error codes`, async () => {
      const error = await Effect.runPromise(
        parsePutObject({
          status: 503,
          statusText: "Unavailable",
          headers: {},
          body,
        }).pipe(Effect.flip),
      );
      expect(error).toBeInstanceOf(SlowDown);
      expect(error).toMatchObject({ message: "Try later" });
      expect(isTransientError(error)).toBe(true);
    });
  }
});

const internalKmsMessage = "Internal KMS service error. Try again.";

describe("Lambda synthetic error parsing", () => {
  test("classifies the observed internal KMS response as retryable", async () => {
    const error = await Effect.runPromise(
      parseCreateFunction(invalidParameterResponse(internalKmsMessage)).pipe(
        Effect.flip,
      ),
    );
    expect(error).toBeInstanceOf(LambdaInternalKmsError);
    expect(error).toMatchObject({ message: internalKmsMessage });
    expect(isTransientError(error)).toBe(true);
  });

  test("keeps other invalid parameters non-retryable", async () => {
    const error = await Effect.runPromise(
      parseCreateFunction(
        invalidParameterResponse("The provided execution role is invalid."),
      ).pipe(Effect.flip),
    );
    expect(error).toBeInstanceOf(InvalidParameterValueException);
    expect(isTransientError(error)).toBe(false);
  });

  test("only specializes operations declaring the synthetic error", async () => {
    const parseUpdateFunctionCode = makeResponseParser({
      input: UpdateFunctionCodeRequest,
      output: FunctionConfiguration,
      errors: [InvalidParameterValueException],
    });
    const error = await Effect.runPromise(
      parseUpdateFunctionCode(
        invalidParameterResponse(internalKmsMessage),
      ).pipe(Effect.flip),
    );
    expect(error).toBeInstanceOf(InvalidParameterValueException);
    expect(isTransientError(error)).toBe(false);
  });
});

describe("2xx response validation", () => {
  const response = (body: unknown) => ({
    status: 200,
    statusText: "OK",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const mismatched = response({ FunctionName: 123 });
  const unmodeled = response({ FunctionName: "fn", Unmodeled: 1 });
  const nestedUnmodeled = response({
    FunctionName: "fn",
    VpcConfig: { VpcId: "vpc-1", Unmodeled: 1 },
  });

  test("lenient (default) falls back to the raw response on a mismatch", async () => {
    const output = await Effect.runPromise(parseCreateFunction(mismatched));
    expect(output).toMatchObject({ FunctionName: 123 });
  });

  for (const mode of ["additionalProperties", "strict"] as const) {
    test(`${mode} fails a mismatch with ParseError`, async () => {
      const error = await Effect.runPromise(
        parseCreateFunction(mismatched).pipe(
          Effect.provide(ResponseValidation[mode]),
          Effect.flip,
        ),
      );
      expect(error).toBeInstanceOf(ParseError);
      expect(isTransientError(error)).toBe(false);
    });

    test(`${mode} decodes a matching response`, async () => {
      const output = await Effect.runPromise(
        parseCreateFunction(response({ FunctionName: "fn" })).pipe(
          Effect.provide(ResponseValidation[mode]),
        ),
      );
      expect(output).toMatchObject({ FunctionName: "fn" });
    });
  }

  // The decoded output carries only modeled members, in every mode.
  for (const mode of ["lenient", "additionalProperties"] as const) {
    test(`${mode} accepts unmodeled members`, async () => {
      for (const [input, expected] of [
        [unmodeled, { FunctionName: "fn" }],
        [
          nestedUnmodeled,
          { FunctionName: "fn", VpcConfig: { VpcId: "vpc-1" } },
        ],
      ] as const) {
        const output = await Effect.runPromise(
          parseCreateFunction(input).pipe(
            Effect.provide(ResponseValidation[mode]),
          ),
        );
        expect(output).toEqual(expected);
      }
    });
  }

  test("strict fails an unmodeled member at any depth with ParseError", async () => {
    for (const input of [unmodeled, nestedUnmodeled]) {
      const error = await Effect.runPromise(
        parseCreateFunction(input).pipe(
          Effect.provide(ResponseValidation.strict),
          Effect.flip,
        ),
      );
      expect(error).toBeInstanceOf(ParseError);
      expect(error).toMatchObject({
        message: expect.stringContaining("Unmodeled"),
      });
    }
  });
});
