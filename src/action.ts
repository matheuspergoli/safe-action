import { createActionBuilder, type ActionBuilder } from "./builder"
import { ActionError, type ErrorHandler } from "./errors"

type CreateOptions<Context, Meta> = {
	defaultMeta?: Meta
	defaultContext?: Context
	errorHandler?: ErrorHandler
}

type ContextFn = () => Promise<object> | object

type ReturnActionBuilder<T extends ActionBuilder<any, any, any, any>> = Omit<T, "_def">

type Unwrap<T> = T extends () => Promise<infer U>
	? Awaited<U>
	: T extends () => infer U
		? U
		: T

class CreateActionBuilder<Context, Meta> {
	meta<NewMeta extends object>() {
		return new CreateActionBuilder<Context, NewMeta>()
	}

	context<NewContext extends ContextFn>() {
		return new CreateActionBuilder<NewContext, Meta>()
	}

	create(
		opts?: CreateOptions<Context, Meta>
	): ReturnActionBuilder<ActionBuilder<unknown, unknown, Unwrap<Context>, Meta>> {
		if (opts?.defaultContext && typeof opts.defaultContext !== "function") {
			throw new ActionError({
				code: "ERROR",
				message: "defaultContext must be a function that returns an object"
			})
		}

		if (opts?.defaultMeta && typeof opts.defaultMeta !== "object") {
			throw new ActionError({
				code: "ERROR",
				message: "defaultMeta must be an object"
			})
		}

		if (opts?.errorHandler && typeof opts.errorHandler !== "function") {
			throw new ActionError({
				code: "ERROR",
				message: "errorHandler must be a function"
			})
		}

		return createActionBuilder<Unwrap<Context>, Meta>({
			meta: opts?.defaultMeta,
			errorHandler: opts?.errorHandler,
			defaultContext: opts?.defaultContext
		})
	}
}

export const CreateAction = new CreateActionBuilder()
