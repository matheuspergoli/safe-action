import type { JSONError } from "./errors"
import type { MaybePromise } from "./utils"

export type HookType = "onSuccess" | "onError" | "onSettled"

export type CheckHookType<T, Context, Meta, Input> = T extends "onSuccess"
	? OnSuccessHookFn<Context, Meta, Input>
	: T extends "onError"
		? OnErrorHookFn<Context, Meta>
		: T extends "onSettled"
			? OnSettledHookFn<Context, Meta>
			: never

export type OnErrorHookFn<Context, Meta> = (opts: {
	meta: Meta
	ctx: Context
	error: JSONError
	rawInput: unknown
}) => MaybePromise<void>

export type OnSettledHookFn<Context, Meta> = (opts: {
	meta: Meta
	ctx: Context
	rawInput: unknown
}) => MaybePromise<void>

export type OnSuccessHookFn<Ctx, Meta, Input> = (opts: {
	ctx: Ctx
	meta: Meta
	input: Input
	rawInput: unknown
}) => MaybePromise<void>

export type Hooks<Context, Meta, Input> = {
	[K in HookType]?: CheckHookType<K, Context, Meta, Input>[]
}

type InferHookOpts<T> = T extends (opts: infer U) => MaybePromise<void> ? U : never

export const executeHook = async <T extends (opts: any) => MaybePromise<void>>(
	hook: T,
	opts: InferHookOpts<T>
) => {
	const resultHook = hook(opts)

	if (resultHook instanceof Promise) {
		await resultHook
	}

	return resultHook
}

export const executeHooks = async <T extends (opts: any) => MaybePromise<void>>(
	hooks: T[] | undefined,
	opts: InferHookOpts<T>
) => {
	if (hooks) {
		for (const hook of hooks) {
			await executeHook(hook, opts)
		}
	}
}
