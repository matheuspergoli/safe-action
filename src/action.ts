import { createActionBuilder, type ActionBuilder } from "./builder"
import { ActionError, type ErrorHandler } from "./errors"
import type { MaybePromise } from "./utils"

type ContextFn = () => MaybePromise<object>

type Unwrap<T> = T extends () => Promise<infer U> ? Awaited<U> : T extends () => infer U ? U : T

type CreateActionBuilderProps = {
	meta?: object
	context?: ContextFn
}

class CreateActionBuilder<Context, Meta> {
	#meta: object | undefined = undefined
	#context: ContextFn | undefined = undefined

	constructor(opts?: CreateActionBuilderProps) {
		this.#meta = opts?.meta
		this.#context = opts?.context
	}

	meta<NewMeta extends object>(meta: NewMeta) {
		this.#meta = meta
		return new CreateActionBuilder<Context, NewMeta>({ meta, context: this.#context })
	}

	context<NewContext extends ContextFn>(ctx: NewContext) {
		this.#context = ctx
		return new CreateActionBuilder<NewContext, Meta>({ meta: this.#meta, context: ctx })
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
