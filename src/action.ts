import { createActionBuilder, type ActionBuilder } from "./builder"
import { type ErrorHandler } from "./errors"

type CreateOptions<Context extends ContextFn, Meta extends object> = {
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

class CreateActionBuilder<Context extends ContextFn, Meta extends object> {
	meta<NewMeta extends object>() {
		return new CreateActionBuilder<Context, NewMeta>()
	}

	context<NewContext extends ContextFn>() {
		return new CreateActionBuilder<NewContext, Meta>()
	}

	create(
		opts?: CreateOptions<Context, Meta>
	): ReturnActionBuilder<ActionBuilder<unknown, unknown, Unwrap<Context>, Meta>> {
		return createActionBuilder<Unwrap<Context>, Meta>({
			meta: opts?.defaultMeta,
			errorHandler: opts?.errorHandler,
			defaultContext: opts?.defaultContext
		})
	}
}

export const CreateAction = new CreateActionBuilder()
