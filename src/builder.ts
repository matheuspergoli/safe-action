import { z } from "zod"

import {
	ActionError,
	getFormattedError,
	isSuccess,
	type Code,
	type ErrorHandler,
	type Result,
	type Success
} from "./errors"
import { executeHooks, type CheckHookType, type Hooks, type HookType } from "./hooks"
import type { AnyNonNullish, MaybePromise, Prettify, TypeError } from "./utils"

type Schema = z.ZodObject<any>
type RetrieveShape<T> = T extends z.ZodObject<infer Shape> ? Shape : never

type CheckSchema<T> = T extends Schema ? T : TypeError<"Schema must be a zod object">

type CreateObjectFromShape<T extends z.ZodRawShape> = {
	[K in keyof T]: T[K] extends z.ZodType<infer _A, infer _B> ? T[K]["_output"] : never
}

type InferOutput<Data, Output> = Output extends AnyNonNullish ? Output : Data
type InferSchema<T> = CreateObjectFromShape<RetrieveShape<T>>

type MergeContext<Context, NextContext> = [Context, NextContext] extends [
	AnyNonNullish,
	AnyNonNullish
]
	? Prettify<Context & NextContext>
	: [Context, NextContext] extends [AnyNonNullish, unknown]
		? Context
		: [Context, NextContext] extends [unknown, AnyNonNullish]
			? NextContext
			: unknown

export type ActionInput<T> = T extends (input: infer Input) => infer _R ? Input : never

export type ActionBuilder<Input, Output, Context, Meta> = {
	/**
	 *
	 * Add a zod schema to validate the action input
	 *
	 * If you chain this method, the schema will be merged with the previous one
	 *
	 * It needs to be a zod object
	 *
	 * @param schema Zod Schema
	 *
	 * @example
	 * action.input(z.object({ name: z.string() }))
	 *
	 * */
	input<$Schema>(
		schema: CheckSchema<$Schema>
	): ActionBuilder<Prettify<Input & InferSchema<$Schema>>, Output, Context, Meta>

	/**
	 *
	 * Add a zod schema to validate action return value
	 *
	 * If you chain this method, the schema will be merged with the previous one
	 *
	 * It needs to be a zod object
	 *
	 * @param schema Zod Schema
	 *
	 * @example
	 * action.output(z.object({ name: z.string() }))
	 *
	 * */
	output<$Schema>(
		schema: CheckSchema<$Schema>
	): ActionBuilder<Input, Prettify<Output & InferSchema<$Schema>>, Context, Meta>

	/**
	 *
	 * Server handler function
	 *
	 * You have access to the context and input data
	 *
	 * @param handler Handler function that will be executed when the action is called
	 *
	 * @example
	 * action.execute(async ({ ctx, input }) => {
	 *    return { name: "John Doe" }
	 * }
	 *
	 * */
	execute<Data>(
		handler: ExecuteHandler<Input, InferOutput<Data, Output>, Context>
	): ExecuteReturnFn<Input, InferOutput<Data, Output>>

	/**
	 *
	 * Add a middleware function to the action
	 *
	 * Middleware functions are executed in the order they are added
	 *
	 * You can access the meta information, context, input data and modify the context
	 *
	 * If you want type-safe input data, you need to chain the input method before the middleware
	 *
	 * If you chain this method, the middleware function will be added to the stack
	 *
	 * @param middlewareFn Middleware function
	 *
	 * @example
	 * action.middleware(async ({ meta, ctx, input, next }) => {
	 *     return next({ ctx: { user: "John Doe" } })
	 * })
	 *
	 * */
	middleware<NextContext>(
		middlewareFn: MiddlewareFn<Context, NextContext, Input, Meta>
	): ActionBuilder<Input, Output, MergeContext<Context, NextContext>, Meta>

	/**
	 *
	 * Access to the meta information added to the action
	 *
	 * @param meta Meta information
	 *
	 * You can modify the values of the meta object but you can't change the type once it's
	 * set in the CreateAction class
	 *
	 * If you chain this method, the meta object will be shallow merged
	 *
	 * @example action.meta({ name: "action-name" })
	 *
	 * */
	meta(meta: Meta): ActionBuilder<Input, Output, Context, Meta>

	/**
	 *
	 * Add a hook function to the action
	 *
	 * Hooks are executed in the order they are added based on the lifecycle event
	 *
	 * You can access the context and meta information depending on the hook type
	 *
	 * If you chain this method, the hook function will be added to the stack
	 *
	 * Hooks have three lifecycle events: onSuccess, onError, onSettled
	 *
	 * @param type Hook type
	 * @param fn Hook function
	 *
	 * @example
	 * action.hook("onSuccess", ({ ctx, meta }) => {
	 *     console.log("Action executed successfully")
	 * })
	 *
	 * */
	hook<Type extends HookType>(
		type: Type,
		fn: CheckHookType<Type, Context, Meta, Input>
	): ActionBuilder<Input, Output, Context, Meta>

	/**
	 *
	 * @internal Definitions of the action builder
	 *
	 * */
	_def: ActionBuilderDef<Meta, Context>
}

type MiddlewareFn<Context, NextContext, Input, Meta> = (opts: {
	meta: Meta
	ctx: Context
	input: Input
	rawInput: unknown
	next: {
		<TContext>(opts: { ctx?: TContext }): MaybePromise<TContext>
		(): MaybePromise<Context>
	}
}) => MaybePromise<NextContext>

type ExecuteHandler<Input, Data, Context> = (opts: { ctx: Context; input: Input }) => Promise<Data>

type ExecuteReturnFn<Input, Data> = Input extends AnyNonNullish
	? (input: Input) => Promise<Result<Data>>
	: () => Promise<Result<Data>>

type ActionBuilderDef<Meta, Context> = {
	meta: Meta
	hooks: AnyHooks
	inputs: Schema[]
	outputs: Schema[]
	defaultContext: Context
	middlewares: AnyMiddlewareFn[]
	errorHandler?: ErrorHandler
}

type AnyHooks = Hooks<any, any, any>
type AnyActionBuilderDef = ActionBuilderDef<any, any>
type AnyMiddlewareFn = MiddlewareFn<any, any, any, any>
type AnyActionBuilder = ActionBuilder<any, any, any, any>

function createNewActionBuilder(
	def1: AnyActionBuilderDef,
	def2: Partial<AnyActionBuilderDef>
): AnyActionBuilder {
	const { inputs, outputs, middlewares, meta, hooks } = def2

	const errorHandler = def2.errorHandler ?? def1.errorHandler
	const defaultContext = def2.defaultContext ?? def1.defaultContext

	return createActionBuilder({
		errorHandler,
		defaultContext,
		inputs: [...def1.inputs, ...(inputs ?? [])],
		outputs: [...def1.outputs, ...(outputs ?? [])],
		middlewares: [...def1.middlewares, ...(middlewares ?? [])],
		meta: def1.meta && meta ? { ...def1.meta, ...meta } : (meta ?? def1.meta),
		hooks: def1.hooks && hooks ? { ...def1.hooks, ...hooks } : (hooks ?? def1.hooks)
	})
}

export function createActionBuilder<Context, Meta>(
	initDef: Partial<AnyActionBuilderDef> = {}
): ActionBuilder<unknown, unknown, Context, Meta> {
	const _def: AnyActionBuilderDef = {
		meta: {},
		hooks: {},
		inputs: [],
		outputs: [],
		middlewares: [],
		defaultContext: {},
		...initDef
	}

	const combineSchema = (schemas: Schema[]) => {
		const initialSchema = z.object({})
		return schemas.reduce((acc, schema) => {
			return acc.merge(schema)
		}, initialSchema)
	}

	const parseSchema = <$Schema extends Schema, T>(
		schema: $Schema,
		data: T,
		schemaType: "input" | "output"
	): Result<T> => {
		try {
			const schemaCodeErrors: Record<typeof schemaType, Code> = {
				input: "PARSE_INPUT_ERROR",
				output: "PARSE_OUTPUT_ERROR"
			}

			if (schemaType === "input" && _def.inputs.length === 0) {
				return { success: true, data }
			}

			if (schemaType === "output" && _def.outputs.length === 0) {
				return { success: true, data }
			}

			const parsedValues = schema.safeParse(data)

			if (!parsedValues.success) {
				const errors = Object.entries(parsedValues.error.flatten().fieldErrors).map(
					([path, message]) => {
						return { path, message }
					}
				)

				const message = errors
					.map(({ path, message }) => {
						if (schemaType === "input") {
							return `Error parsing input at param: ${path} - ${message}`
						}

						if (schemaType === "output") {
							return `Error parsing output at param: ${path} - ${message}`
						}

						return `Error parsing at: ${path} - ${message}`
					})
					.join("\n")

				const defaultMessage = "Error parsing schema"

				return {
					success: false,
					error: new ActionError({
						code: schemaCodeErrors[schemaType],
						message: message.length === 0 ? defaultMessage : message
					})
				}
			}

			return { success: true, data: parsedValues.data as T }
		} catch (error) {
			const formattedError = getFormattedError(error)
			return {
				success: false,
				error: formattedError
			}
		}
	}

	const executeMiddlewareStack = async <Ctx, Input>({
		idx = 0,
		input,
		prevCtx,
		rawInput
	}: {
		input: Input
		idx?: number
		prevCtx: Ctx
		rawInput: unknown
	}): Promise<Ctx> => {
		const meta = _def.meta
		const middlewareFn = _def.middlewares[idx]

		if (middlewareFn) {
			const resultFn = middlewareFn({
				meta,
				ctx: prevCtx,
				input,
				rawInput,
				next: async (opts?: { ctx?: unknown }) => {
					let mergedContext

					if (prevCtx) {
						mergedContext = { ...prevCtx }
					}

					if (opts?.ctx) {
						mergedContext = { ...mergedContext, ...opts.ctx }
					}

					return await executeMiddlewareStack({
						idx: idx + 1,
						prevCtx: mergedContext,
						input,
						rawInput
					})
				}
			})

			if (resultFn instanceof Promise) {
				return (await resultFn) ?? prevCtx
			}

			return resultFn ?? prevCtx
		}

		return prevCtx
	}

	const executeMiddleware = async <T>({
		input,
		rawInput
	}: {
		input: unknown
		rawInput: unknown
	}): Promise<Result<T>> => {
		try {
			let defaultContext

			if (_def.defaultContext) {
				defaultContext = _def.defaultContext()
			}

			if (defaultContext instanceof Promise) {
				defaultContext = await defaultContext
			}

			const ctx = await executeMiddlewareStack({
				prevCtx: defaultContext,
				input,
				rawInput
			})

			return { success: true, data: ctx as T }
		} catch (error) {
			const formattedError = getFormattedError(error)
			return { success: false, error: formattedError }
		}
	}

	const builder: AnyActionBuilder = {
		_def,
		meta(meta) {
			return createNewActionBuilder(_def, { meta })
		},
		input(input) {
			return createNewActionBuilder(_def, { inputs: [input as Schema] })
		},
		output(output) {
			return createNewActionBuilder(_def, { outputs: [output as Schema] })
		},
		hook(type, fn) {
			const hooks = _def.hooks[type] ?? []
			return createNewActionBuilder(_def, { hooks: { [type]: [...hooks, fn] } })
		},
		middleware(middlewareFn) {
			return createNewActionBuilder(_def, { middlewares: [middlewareFn] })
		},
		execute(handler) {
			const { inputs, outputs, hooks, meta } = _def

			let ctx: Context
			let parsedInput: Result<any>
			let parsedOutput: Result<any>

			return async (rawInput) => {
				try {
					const inputSchema = combineSchema(inputs)
					const outputSchema = combineSchema(outputs)

					const inputParseResult = parseSchema(inputSchema, rawInput, "input")
					if (!isSuccess(inputParseResult)) {
						throw new ActionError(inputParseResult.error)
					}
					parsedInput = inputParseResult?.data as Success<any>["data"]

					const ctxResult = await executeMiddleware({
						rawInput,
						input: parsedInput
					})
					if (!isSuccess(ctxResult)) {
						throw new ActionError(ctxResult.error)
					}
					ctx = ctxResult?.data as Context

					const rawData = await handler({
						ctx,
						input: parsedInput
					})

					const outputParseResult = parseSchema(outputSchema, rawData, "output")
					if (!isSuccess(outputParseResult)) {
						throw new ActionError(outputParseResult.error)
					}
					parsedOutput = outputParseResult?.data as Success<any>["data"]

					await executeHooks(hooks["onSuccess"], {
						ctx,
						meta,
						rawInput,
						input: parsedInput
					})

					return { success: true, data: parsedOutput ?? rawData }
				} catch (error) {
					const formattedError = getFormattedError(error)

					if (builder._def.errorHandler) {
						await builder._def.errorHandler(formattedError)
					}

					if (formattedError.code === "NEXT_ERROR") {
						await executeHooks(hooks["onSuccess"], {
							ctx,
							meta,
							rawInput,
							input: parsedInput
						})

						throw error
					}

					await executeHooks(hooks["onError"], {
						ctx,
						meta,
						rawInput,
						error: formattedError
					})

					return { success: false, error: formattedError }
				} finally {
					await executeHooks(hooks["onSettled"], {
						ctx,
						meta,
						rawInput
					})
				}
			}
		}
	}

	return builder as ActionBuilder<unknown, unknown, Context, Meta>
}
