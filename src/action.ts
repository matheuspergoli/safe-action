import { z } from "zod"

import {
	ActionError,
	getFormattedError,
	isSuccess,
	type Code,
	type JSONError,
	type Result
} from "./errors"

type AnyNonNullish = NonNullable<unknown>

type Prettify<T> = {
	[K in keyof T]: T[K]
} & AnyNonNullish

type Schema = z.ZodObject<any>
type MaybePromise<T> = Promise<T> | T
type TypeError<Message extends string> = Message
type RetrieveShape<T> = T extends z.ZodObject<infer Shape> ? Shape : never
type CheckSchema<T> = T extends Schema ? T : TypeError<"Schema must be a zod object">

type CreateObject<T extends z.ZodRawShape> = {
	[K in keyof T]: T[K] extends z.ZodType<infer _A, infer _B> ? T[K]["_output"] : never
}

type InferOutput<Data, Output> = Output extends AnyNonNullish ? Output : Data
type Infer<T> = CreateObject<RetrieveShape<T>>

type ActionBuilder<Input, Output, Context> = {
	input<$Schema>(
		schema: CheckSchema<$Schema>
	): ActionBuilder<Prettify<Input & Infer<$Schema>>, Output, Context>

	output<$Schema>(
		schema: CheckSchema<$Schema>
	): ActionBuilder<Input, Prettify<Output & Infer<$Schema>>, Context>

	execute<Data>(
		handler: ExecuteHandler<Input, InferOutput<Data, Output>, Context>
	): ExecuteReturnFn<Input, InferOutput<Data, Output>>

	middleware<NextContext>(
		middlewareFn: MiddlewareFn<Context, NextContext, Input>
	): ActionBuilder<Input, Output, Prettify<Context & NextContext>>

	_def: ActionBuilderDef
}

type ErrorHandler = (error: JSONError) => MaybePromise<void>

type MiddlewareFn<Context, NextContext, Input> = (opts: {
	ctx: Context
	input: Input
	next: <TContext>(opts: { ctx: TContext }) => MaybePromise<TContext>
}) => MaybePromise<NextContext>

type ExecuteHandler<Input, Data, Context> = (opts: {
	ctx: Context
	input: Input
}) => Promise<Data>

type ExecuteReturnFn<Input, Data> = Input extends AnyNonNullish
	? (input: Input) => Promise<Result<Data>>
	: () => Promise<Result<Data>>

type ActionBuilderDef = {
	inputs: Schema[]
	outputs: Schema[]
	middlewares: AnyMiddlewareFn[]
	errorHandler?: ErrorHandler
}

type AnyActionBuilderDef = ActionBuilderDef
type AnyMiddlewareFn = MiddlewareFn<any, any, any>
type AnyActionBuilder = ActionBuilder<any, any, any>

function createNewActionBuilder(
	def1: AnyActionBuilderDef,
	def2: Partial<AnyActionBuilderDef>
): AnyActionBuilder {
	const { inputs, outputs, middlewares } = def2

	const errorHandler = def2.errorHandler ?? def1.errorHandler

	return createActionBuilder({
		errorHandler,
		inputs: [...def1.inputs, ...(inputs ?? [])],
		outputs: [...def1.outputs, ...(outputs ?? [])],
		middlewares: [...def1.middlewares, ...(middlewares ?? [])]
	})
}

function createActionBuilder(
	initDef: Partial<AnyActionBuilderDef> = {}
): ActionBuilder<unknown, unknown, unknown> {
	const _def: AnyActionBuilderDef = {
		inputs: [],
		outputs: [],
		middlewares: [],
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
		code: Code
	): Result<T> => {
		try {
			const parsedValues = schema.safeParse(data)

			if (!parsedValues.success) {
				const errors = Object.entries(parsedValues.error.flatten().fieldErrors).map(
					([path, message]) => {
						return { path, message }
					}
				)

				const message = errors
					.map(({ path, message }) => {
						if (code === "PARSE_INPUT_ERROR") {
							return `Error parsing input at param: ${path} - ${message}`
						}

						if (code === "PARSE_OUTPUT_ERROR") {
							return `Error parsing output at param: ${path} - ${message}`
						}

						return `Error parsing at: ${path} - ${message}`
					})
					.join("\n")

				const defaultMessage = "Error parsing schema"

				return {
					success: false,
					error: new ActionError({
						code,
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
		prevCtx
	}: {
		input: Input
		idx?: number
		prevCtx: Ctx
	}): Promise<Ctx> => {
		const middlewareFn = _def.middlewares[idx]

		if (middlewareFn) {
			return await Promise.resolve(
				middlewareFn({
					input,
					ctx: prevCtx,
					next: async ({ ctx }) => {
						return await executeMiddlewareStack({
							idx: idx + 1,
							prevCtx: ctx,
							input
						})
					}
				})
			)
		}

		return prevCtx
	}

	const executeMiddleware = async <T>(input: unknown): Promise<Result<T>> => {
		try {
			const context = {}

			const ctx = await executeMiddlewareStack({ prevCtx: context, input })

			return { success: true, data: ctx as T }
		} catch (error) {
			const formattedError = getFormattedError(error)
			return { success: false, error: formattedError }
		}
	}

	const builder: AnyActionBuilder = {
		_def,
		input(input) {
			return createNewActionBuilder(_def, { inputs: [input as Schema] })
		},
		output(output) {
			return createNewActionBuilder(_def, { outputs: [output as Schema] })
		},
		middleware(middlewareFn) {
			return createNewActionBuilder(_def, { middlewares: [middlewareFn] })
		},
		execute(handler) {
			const { inputs, outputs } = _def

			return async (input) => {
				try {
					let inputResult
					let outputResult
					const inputSchema = combineSchema(inputs)
					const outputSchema = combineSchema(outputs)

					if (inputs.length > 0) {
						inputResult = parseSchema(inputSchema, input, "PARSE_INPUT_ERROR")
						if (!isSuccess(inputResult)) {
							throw inputResult.error
						}
					}

					const ctx = await executeMiddleware(input)
					if (!isSuccess(ctx)) {
						const { message, cause } = ctx.error
						throw new ActionError({ code: "MIDDLEWARE_ERROR", message, cause })
					}

					const data = await handler({
						input: inputResult?.data,
						ctx: ctx.data
					})

					if (outputs.length > 0) {
						outputResult = parseSchema(outputSchema, data, "PARSE_OUTPUT_ERROR")
						if (!isSuccess(outputResult)) {
							throw outputResult.error
						}
					}

					return { success: true, data: outputResult?.data ?? data }
				} catch (error) {
					const formattedError = getFormattedError(error)
					if (builder._def.errorHandler) {
						await builder._def.errorHandler(formattedError)
					}
					if (formattedError.code === "NEXT_ERROR") {
						throw error
					}
					return { success: false, error: formattedError }
				}
			}
		}
	}

	return builder as ActionBuilder<unknown, unknown, unknown>
}

export const actionBuilder = (opts?: { errorHandler?: ErrorHandler }) => {
	return createActionBuilder({ errorHandler: opts?.errorHandler })
}
