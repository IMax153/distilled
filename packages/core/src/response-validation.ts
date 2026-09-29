/**
 * Response validation mode, shared by every distilled SDK.
 *
 * Generated SDKs carry a schema for every operation's output. What a
 * protocol does with it on a 2xx response depends on the mode:
 *
 *   lenient (default)     The response is returned as the protocol read it.
 *                         The protocol checks only what it needs in order to
 *                         transform the body (unwrap an envelope, map keys,
 *                         wrap sensitive members). A body that does not match
 *                         the declared output type — a missing member, a
 *                         wrong primitive, a non-JSON body — still succeeds.
 *   additionalProperties  The response is decoded against the output schema;
 *                         a mismatch fails the call with the SDK's
 *                         `<Sdk>ParseError` (AWS: `ParseError`). Members the
 *                         schema does not model are allowed.
 *   strict                As `additionalProperties`, and a member the schema
 *                         does not model also fails the call.
 *
 * The mode is one {@link ResponseValidation} reference keyed by a string, so
 * a single `Layer` switches every distilled SDK in a program — AWS,
 * Cloudflare, Neon, … — at once, and nests like any other Effect service:
 *
 * ```ts
 * import { ResponseValidation } from "@distilled.cloud/core";
 *
 * // whole program
 * program.pipe(Effect.provide(ResponseValidation.strict));
 *
 * // one call back to lenient inside a strict program
 * Neon.getProject({ projectId }).pipe(Effect.provide(ResponseValidation.lenient));
 * ```
 *
 * The mode is set only by these layers; without one, every call is lenient.
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import type * as AST from "effect/SchemaAST";

export type Mode = "lenient" | "additionalProperties" | "strict";

/**
 * The active validation mode. Read by protocols at call time on the calling
 * fiber; `lenient` unless a layer below is provided.
 */
export const ResponseValidation = Context.Reference<Mode>(
  "@distilled.cloud/core/ResponseValidation",
  { defaultValue: () => "lenient" },
);

/** Return 2xx responses as read; check only what the transform needs. */
export const lenient: Layer.Layer<never> = Layer.succeed(
  ResponseValidation,
  "lenient",
);

/**
 * Decode every 2xx response against its output schema and fail on a
 * mismatch; members the schema does not model are allowed.
 */
export const additionalProperties: Layer.Layer<never> = Layer.succeed(
  ResponseValidation,
  "additionalProperties",
);

/**
 * Decode every 2xx response against its output schema and fail on a
 * mismatch, including any member the schema does not model.
 */
export const strict: Layer.Layer<never> = Layer.succeed(
  ResponseValidation,
  "strict",
);

/** Whether the calling fiber validates responses (any mode but lenient). */
export const isValidating: Effect.Effect<boolean> = Effect.map(
  ResponseValidation,
  (mode) => mode !== "lenient",
);

/**
 * Schema parse options for the calling fiber's mode, for protocols that
 * decode with their own schema (AWS). `undefined` in lenient mode.
 */
export const parseOptions: Effect.Effect<AST.ParseOptions | undefined> =
  Effect.map(ResponseValidation, (mode) =>
    mode === "lenient"
      ? undefined
      : { onExcessProperty: mode === "strict" ? "error" : "ignore" },
  );

/**
 * For a 2xx body the protocol could not read into the shape it transforms
 * (e.g. invalid JSON): fail with `error` when validating, succeed with
 * `asRead` (usually the body text) in lenient mode.
 */
export const failUnlessLenient = <A, E>(
  error: E,
  asRead: A,
): Effect.Effect<A, E> =>
  Effect.flatMap(ResponseValidation, (mode) =>
    mode === "lenient" ? Effect.succeed(asRead) : Effect.fail(error),
  );

const decoders = new WeakMap<
  AST.AST,
  (
    input: unknown,
    options?: AST.ParseOptions,
  ) => Effect.Effect<unknown, Schema.SchemaError>
>();

const decoderFor = (ast: AST.AST) => {
  let decode = decoders.get(ast);
  if (!decode) {
    decode = Schema.decodeUnknownEffect(Schema.make<Schema.Top>(ast)) as (
      input: unknown,
      options?: AST.ParseOptions,
    ) => Effect.Effect<unknown, Schema.SchemaError>;
    decoders.set(ast, decode);
  }
  return decode;
};

/**
 * Check a 2xx response value against the operation's output schema.
 *
 * Lenient mode returns `value` untouched. The validating modes decode it
 * (`strict` also rejecting unmodeled members) and, on a mismatch, fail with
 * `onError(schemaError)` — protocols pass their SDK's `<Sdk>ParseError`
 * constructor. On success the ORIGINAL value is returned (unmodeled members
 * are kept), so switching modes never changes what a successful call
 * returns.
 *
 * `value` must already be in the schema's shape (TS member names), i.e.
 * after any wire→TS key mapping and before `Redacted` wrapping.
 */
export const validateResponse = <E>(
  outputAst: AST.AST,
  value: unknown,
  onError: (cause: Schema.SchemaError) => E,
): Effect.Effect<unknown, E> =>
  Effect.flatMap(parseOptions, (options) =>
    options === undefined
      ? Effect.succeed(value)
      : decoderFor(outputAst)(value, options).pipe(
          Effect.mapError(onError),
          Effect.as(value),
        ),
  );
