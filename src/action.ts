import { createActionBuilder, type ActionBuilder } from "./builder"
import { ActionError, type ErrorHandler } from "./errors"
import type { MaybePromise } from "./utils"

type ContextFn = () => MaybePromise<object>

type Unwrap<T> = T extends () => Promise<infer U> ? Awaited<U> : T extends () => infer U ? U : T

class CreateActionBuilder<Context, Meta> {
	#meta: object | undefined = undefined
	#context: ContextFn | undefined = undefined

	meta<NewMeta extends object>(meta: NewMeta) {
		this.#meta = meta
		return new CreateActionBuilder<Context, NewMeta>()
	}

	context<NewContext extends ContextFn>(ctx: NewContext) {
		this.#context = ctx
		return new CreateActionBuilder<NewContext, Meta>()
	}

	create(opts?: {
		errorHandler?: ErrorHandler
	}): ActionBuilder<unknown, unknown, Unwrap<Context>, Meta> {
		if (opts && "errorHandler" in opts && typeof opts.errorHandler !== "function") {
			throw new ActionError({
				code: "ERROR",
				message: "errorHandler must be a function"
			})
		}

		const errorHandler = opts && "errorHandler" in opts ? opts.errorHandler : undefined

		return createActionBuilder<Unwrap<Context>, Meta>({
			meta: this.#meta,
			defaultContext: this.#context,
			errorHandler: errorHandler as ErrorHandler
		})
	}
}

export const CreateAction = new CreateActionBuilder()
