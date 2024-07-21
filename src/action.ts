import { createActionBuilder, type ActionBuilder } from "./builder"
import { ActionError, type ErrorHandler } from "./errors"
import type { AnyNonNullish, MaybePromise, UnsetMarker } from "./utils"

type ContextFn = () => MaybePromise<object>

type MetaTypeError = "object"
type ContextFnTypeError = "() => Promise<object> | object"
type MetaError = `Generic of type ${MetaTypeError} is required for .meta<type>()`
type ContextError = `Generic of type ${ContextFnTypeError} is required for .context<type>()`

type CreateOptions<C, M> = [C, M] extends [UnsetMarker, UnsetMarker]
	? {
			defaultMeta: MetaError
			defaultContext: ContextError
			errorHandler?: ErrorHandler
		}
	: [C, M] extends [ContextFn, UnsetMarker]
		? {
				defaultMeta: MetaError
				defaultContext: C
				errorHandler?: ErrorHandler
			}
		: [C, M] extends [UnsetMarker, object]
			? {
					defaultMeta: M
					defaultContext: ContextError
					errorHandler?: ErrorHandler
				}
			: [C, M] extends [ContextFn, object]
				? {
						defaultMeta: M
						defaultContext: C
						errorHandler?: ErrorHandler
					}
				: [C, M] extends [UnsetMarker, unknown]
					? {
							defaultContext: ContextError
							errorHandler?: ErrorHandler
						}
					: [C, M] extends [unknown, UnsetMarker]
						? {
								defaultMeta: MetaError
								errorHandler?: ErrorHandler
							}
						: [C, M] extends [ContextFn, unknown]
							? {
									defaultContext: C
									errorHandler?: ErrorHandler
								}
							: [C, M] extends [unknown, object]
								? {
										defaultMeta: M
										errorHandler?: ErrorHandler
									}
								: {
										errorHandler?: ErrorHandler
									}

type Unwrap<T> = T extends () => Promise<infer U> ? Awaited<U> : T extends () => infer U ? U : T

type CheckOpts<C, M> = C extends AnyNonNullish
	? [opts: CreateOptions<C, M>]
	: M extends AnyNonNullish
		? [opts: CreateOptions<C, M>]
		: [opts?: CreateOptions<C, M>]

type ValidMeta<T> = T extends object ? T : UnsetMarker
type ValidContext<T> = T extends ContextFn ? T : UnsetMarker

class CreateActionBuilder<Context, Meta> {
	meta<NewMeta = UnsetMarker>() {
		return new CreateActionBuilder<Context, ValidMeta<NewMeta>>()
	}

	context<NewContext = UnsetMarker>() {
		return new CreateActionBuilder<ValidContext<NewContext>, Meta>()
	}

	create<C extends Context, M extends Meta>(
		...opts: CheckOpts<C, M>
	): ActionBuilder<unknown, unknown, Unwrap<Context>, Meta> {
		const def = opts[0]

		if (def && "defaultContext" in def && typeof def.defaultContext !== "function") {
			throw new ActionError({
				code: "ERROR",
				message: "defaultContext must be a function"
			})
		}

		if (def && "defaultMeta" in def && typeof def.defaultMeta !== "object") {
			throw new ActionError({
				code: "ERROR",
				message: "defaultMeta must be an object"
			})
		}

		if (def && "errorHandler" in def && typeof def.errorHandler !== "function") {
			throw new ActionError({
				code: "ERROR",
				message: "errorHandler must be a function"
			})
		}

		const errorHandler = def && "errorHandler" in def ? def.errorHandler : undefined

		return createActionBuilder<Unwrap<Context>, Meta>({
			errorHandler: errorHandler as ErrorHandler,
			meta: def && "defaultMeta" in def ? def.defaultMeta : undefined,
			defaultContext: def && "defaultContext" in def ? def.defaultContext : undefined
		})
	}
}

export const CreateAction = new CreateActionBuilder()
