import { createActionBuilder, type ActionBuilder } from "./builder"
import { type ErrorHandler } from "./errors"

type CreateOptions<Context, Meta> = {
	defaultMeta?: Meta
	defaultContext?: Context
	errorHandler?: ErrorHandler
}

type ContextFn = () => Promise<object> | object

type Unwrap<T> = T extends () => Promise<infer U>
	? Awaited<U>
	: T extends () => infer U
		? U
		: T

class CreateActionBuilder<Context extends object, Meta extends object> {
	meta<NewMeta extends object>() {
		return new CreateActionBuilder<Context, NewMeta>()
	}

	context<NewContext extends object | ContextFn>() {
		return new CreateActionBuilder<NewContext, Meta>()
	}

	create(
		opts?: CreateOptions<Context, Meta>
	): ActionBuilder<unknown, unknown, Unwrap<Context>, Meta> {
		return createActionBuilder<Unwrap<Context>, Meta>({
			meta: opts?.defaultMeta,
			context: opts?.defaultContext,
			errorHandler: opts?.errorHandler
		})
	}
}

export const CreateAction = new CreateActionBuilder()
