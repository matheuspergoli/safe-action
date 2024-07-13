import { createActionBuilder, type ActionBuilder } from "./builder"
import { ActionError, type ErrorHandler } from "./errors"

type ContextFn = () => Promise<object> | object

type CreateOptions<Context, Meta> = [Context, Meta] extends [ContextFn, object]
	? {
			defaultMeta: Meta
			defaultContext: Context
			errorHandler?: ErrorHandler
		}
	: [Context, Meta] extends [ContextFn, unknown]
		? {
				defaultContext: Context
				errorHandler?: ErrorHandler
			}
		: [Context, Meta] extends [unknown, object]
			? {
					defaultMeta: Meta
					errorHandler?: ErrorHandler
				}
			: {
					errorHandler?: ErrorHandler
				}

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
	): ActionBuilder<unknown, unknown, Unwrap<Context>, Meta> {
		if (opts && "defaultContext" in opts && typeof opts.defaultContext !== "function") {
			throw new ActionError({
				code: "ERROR",
				message: "defaultContext must be a function"
			})
		}

		if (opts && "defaultMeta" in opts && typeof opts.defaultMeta !== "object") {
			throw new ActionError({
				code: "ERROR",
				message: "defaultMeta must be an object"
			})
		}

		if (opts && "errorHandler" in opts && typeof opts.errorHandler !== "function") {
			throw new ActionError({
				code: "ERROR",
				message: "errorHandler must be a function"
			})
		}

		return createActionBuilder<Unwrap<Context>, Meta>({
			errorHandler: opts?.errorHandler,
			meta: opts && "defaultMeta" in opts ? opts.defaultMeta : undefined,
			defaultContext: opts && "defaultContext" in opts ? opts.defaultContext : undefined
		})
	}
}

export const CreateAction = new CreateActionBuilder()
