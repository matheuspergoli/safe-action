import { z } from "zod"

import { createActionBuilder } from "./builder"
import { ActionError } from "./errors"

const contextValues = { userId: 1 }
const contextSync = () => {
	return contextValues
}
const contextAsync = async () => {
	return contextValues
}
const metaValues = { span: "span" }

describe("builder", () => {
	it("should create action with context and meta", async () => {
		const action1 = createActionBuilder<typeof contextSync, typeof metaValues>({
			meta: metaValues,
			defaultContext: contextSync
		})
		const action2 = createActionBuilder<typeof contextAsync, typeof metaValues>({
			meta: metaValues,
			defaultContext: contextAsync
		})

		expect(action1._def.meta).toEqual(metaValues)
		expect(action1._def.defaultContext()).toEqual(contextValues)

		expect(action2._def.meta).toEqual(metaValues)
		expect(await action2._def.defaultContext()).toEqual(contextValues)
	})

	it("should create action with context and no meta", async () => {
		const action1 = createActionBuilder<typeof contextSync, unknown>({
			defaultContext: contextSync
		})
		const action2 = createActionBuilder<typeof contextAsync, unknown>({
			defaultContext: contextAsync
		})

		expect(action1._def.meta).toEqual({})
		expect(action1._def.defaultContext()).toEqual(contextValues)

		expect(action2._def.meta).toEqual({})
		expect(await action2._def.defaultContext()).toEqual(contextValues)
	})

	it("should create action with meta and no context", async () => {
		const action = createActionBuilder<unknown, typeof metaValues>({
			meta: metaValues
		})

		expect(action._def.meta).toEqual(metaValues)
		expect(action._def.defaultContext).toEqual({})
	})

	it("should create action with no context and no meta", async () => {
		const action = createActionBuilder<unknown, unknown>({})

		expect(action._def.meta).toEqual({})
		expect(action._def.defaultContext).toEqual({})
	})

	it("should create action with meta and modify the values of it", async () => {
		const action = createActionBuilder<unknown, typeof metaValues>({
			meta: metaValues
		})
			.meta({ span: "span2" })
			.meta({ span: "span3" })

		expect(action._def.meta).toEqual({ span: "span3" })
	})

	it("should contain 3 hooks for each life cycle and 0 for the others", async () => {
		const action1 = createActionBuilder<unknown, unknown>()
			.hook("onSuccess", () => {})
			.hook("onSuccess", () => {})
			.hook("onSuccess", () => {})
		const action2 = createActionBuilder<unknown, unknown>()
			.hook("onError", () => {})
			.hook("onError", () => {})
			.hook("onError", () => {})
		const action3 = createActionBuilder<unknown, unknown>()
			.hook("onSettled", () => {})
			.hook("onSettled", () => {})
			.hook("onSettled", () => {})

		expect(action1._def.hooks.onSuccess).toHaveLength(3)
		expect(action1._def.hooks.onError).toBeUndefined()
		expect(action1._def.hooks.onSettled).toBeUndefined()

		expect(action2._def.hooks.onSuccess).toBeUndefined()
		expect(action2._def.hooks.onError).toHaveLength(3)
		expect(action2._def.hooks.onSettled).toBeUndefined()

		expect(action3._def.hooks.onSuccess).toBeUndefined()
		expect(action3._def.hooks.onError).toBeUndefined()
		expect(action3._def.hooks.onSettled).toHaveLength(3)
	})

	it("should contain 1 hook for each life cycle with context, meta and no actions's input", async () => {
		const action1 = createActionBuilder<typeof contextSync, typeof metaValues>({
			meta: metaValues,
			defaultContext: contextSync
		})
			.hook("onSuccess", ({ ctx, meta, input, rawInput }) => {
				expect(ctx).toEqual(contextValues)
				expect(meta).toEqual(metaValues)
				expect(input).toBeUndefined()
				expect(rawInput).toBeUndefined()
			})
			.hook("onError", ({ ctx, meta, rawInput }) => {
				expect(ctx).toEqual(contextValues)
				expect(meta).toEqual(metaValues)
				expect(rawInput).toBeUndefined()
			})
			.hook("onSettled", ({ ctx, meta, rawInput }) => {
				expect(ctx).toEqual(contextValues)
				expect(meta).toEqual(metaValues)
				expect(rawInput).toBeUndefined()
			})
		const execute1 = action1.execute(async () => {})

		const action2 = createActionBuilder<typeof contextAsync, typeof metaValues>({
			meta: metaValues,
			defaultContext: contextAsync
		})
			.hook("onSuccess", ({ ctx, meta, input, rawInput }) => {
				expect(ctx).toEqual(contextValues)
				expect(meta).toEqual(metaValues)
				expect(input).toBeUndefined()
				expect(rawInput).toBeUndefined()
			})
			.hook("onError", ({ ctx, meta, rawInput }) => {
				expect(ctx).toEqual(contextValues)
				expect(meta).toEqual(metaValues)
				expect(rawInput).toBeUndefined()
			})
			.hook("onSettled", ({ ctx, meta, rawInput }) => {
				expect(ctx).toEqual(contextValues)
				expect(meta).toEqual(metaValues)
				expect(rawInput).toBeUndefined()
			})
		const execute2 = action2.execute(async () => {})

		await execute1()
		await execute2()

		expect(action1._def.hooks.onSuccess).toHaveLength(1)
		expect(action1._def.hooks.onError).toHaveLength(1)
		expect(action1._def.hooks.onSettled).toHaveLength(1)

		expect(action2._def.hooks.onSuccess).toHaveLength(1)
		expect(action2._def.hooks.onError).toHaveLength(1)
		expect(action2._def.hooks.onSettled).toHaveLength(1)
	})

	it("should contain 1 hook for each life cycle with context, meta and the action's input", async () => {
		const inputValue = { name: "John" }

		const action1 = createActionBuilder<typeof contextSync, typeof metaValues>({
			meta: metaValues,
			defaultContext: contextSync
		})
			.input(z.object({ name: z.string() }))
			.hook("onSuccess", ({ ctx, meta, input, rawInput }) => {
				expect(ctx).toEqual(contextValues)
				expect(meta).toEqual(metaValues)
				expect(input).toEqual(inputValue)
				expect(rawInput).toEqual(inputValue)
			})
			.hook("onError", ({ ctx, meta, rawInput }) => {
				expect(ctx).toEqual(contextValues)
				expect(meta).toEqual(metaValues)
				expect(rawInput).toEqual(inputValue)
			})
			.hook("onSettled", ({ ctx, meta, rawInput }) => {
				expect(ctx).toEqual(contextValues)
				expect(meta).toEqual(metaValues)
				expect(rawInput).toEqual(inputValue)
			})
		const execute1 = action1.execute(async () => {})

		const action2 = createActionBuilder<typeof contextAsync, typeof metaValues>({
			meta: metaValues,
			defaultContext: contextAsync
		})
			.input(z.object({ name: z.string() }))
			.hook("onSuccess", ({ ctx, meta, input, rawInput }) => {
				expect(ctx).toEqual(contextValues)
				expect(meta).toEqual(metaValues)
				expect(input).toEqual(inputValue)
				expect(rawInput).toEqual(inputValue)
			})
			.hook("onError", ({ ctx, meta, rawInput }) => {
				expect(ctx).toEqual(contextValues)
				expect(meta).toEqual(metaValues)
				expect(rawInput).toEqual(inputValue)
			})
			.hook("onSettled", ({ ctx, meta, rawInput }) => {
				expect(ctx).toEqual(contextValues)
				expect(meta).toEqual(metaValues)
				expect(rawInput).toEqual(inputValue)
			})
		const execute2 = action2.execute(async () => {})

		await execute1(inputValue)
		await execute2(inputValue)

		expect(action1._def.hooks.onSuccess).toHaveLength(1)
		expect(action1._def.hooks.onError).toHaveLength(1)
		expect(action1._def.hooks.onSettled).toHaveLength(1)

		expect(action2._def.hooks.onSuccess).toHaveLength(1)
		expect(action2._def.hooks.onError).toHaveLength(1)
		expect(action2._def.hooks.onSettled).toHaveLength(1)
	})

	it("should combine multiple schema parsers", async () => {
		const values = { name: "John", age: 25, email: "john@email.com" }

		const action = createActionBuilder<unknown, unknown>()
			.input(z.object({ name: z.string() }))
			.input(z.object({ age: z.number() }))
			.input(z.object({ email: z.string() }))
			.output(z.object({ name: z.string() }))
			.output(z.object({ age: z.number() }))
			.output(z.object({ email: z.string() }))
			.execute(async ({ input }) => {
				expect(input).toEqual(values)
				return input
			})

		const result = await action(values)

		expect(result.data).toEqual(values)
	})

	it("should contain 3 parsers for input, output with no meta and no context", async () => {
		const values = { name: "John", age: 25, email: "john@email.com" }

		const action = createActionBuilder<unknown, unknown>()
			.input(z.object({ name: z.string() }))
			.input(z.object({ age: z.number() }))
			.input(z.object({ email: z.string() }))
			.output(z.object({ name: z.string() }))
			.output(z.object({ age: z.number() }))
			.output(z.object({ email: z.string() }))

		const execute = action.execute(async ({ input, ctx }) => {
			expect(input).toEqual(values)
			expect(ctx).toBeUndefined()
			return input
		})

		const result = await execute(values)

		expect(result.data).toEqual(values)

		expect(action._def.inputs).toHaveLength(3)
		expect(action._def.outputs).toHaveLength(3)
	})

	it("should contain 1 parser for input and output with context and meta", async () => {
		const action1 = createActionBuilder<typeof contextSync, typeof metaValues>({
			meta: metaValues,
			defaultContext: contextSync
		})
			.input(z.object({ name: z.string() }))
			.output(z.object({ name: z.string() }))
		const action2 = createActionBuilder<typeof contextAsync, typeof metaValues>({
			meta: metaValues,
			defaultContext: contextAsync
		})
			.input(z.object({ name: z.string() }))
			.output(z.object({ name: z.string() }))

		const execute1 = action1.execute(async ({ input, ctx }) => {
			expect(input).toEqual({ name: "John" })
			expect(ctx).toEqual(contextValues)
			return input
		})
		const execute2 = action2.execute(async ({ input, ctx }) => {
			expect(input).toEqual({ name: "John" })
			expect(ctx).toEqual(contextValues)
			return input
		})

		const result1 = await execute1({ name: "John" })
		const result2 = await execute2({ name: "John" })

		expect(result1.data).toEqual({ name: "John" })
		expect(result2.data).toEqual({ name: "John" })

		expect(action1._def.inputs).toHaveLength(1)
		expect(action1._def.outputs).toHaveLength(1)

		expect(action2._def.inputs).toHaveLength(1)
		expect(action2._def.outputs).toHaveLength(1)
	})

	it("should match action input with params", async () => {
		const inputValues = { name: "John", age: 25, email: "john@email.com" }

		const action = createActionBuilder<unknown, unknown>()
			.input(z.object({ name: z.string() }))
			.input(z.object({ age: z.number() }))
			.input(z.object({ email: z.string() }))
			.execute(async ({ input }) => {
				expect(input).toEqual(inputValues)
				return input
			})

		const result = await action(inputValues)

		expect(result.data).toEqual(inputValues)
	})

	it("should return only the values that match the output", async () => {
		const outputValues = { name: "John", age: 25, email: "john@email.com" }

		const action = createActionBuilder<unknown, unknown>()
			.output(z.object({ name: z.string() }))
			.output(z.object({ age: z.number() }))
			.output(z.object({ email: z.string() }))
			.execute(async () => {
				return {
					...outputValues,
					other: "value",
					another: "value"
				}
			})

		const result = await action()

		expect(result.data).toEqual(outputValues)
	})

	it("should execute middlewares in the correct order", async () => {
		let order = 0
		const action = createActionBuilder<unknown, unknown>()
			.middleware(async ({ next }) => {
				expect(order++).toBe(0)
				return next()
			})
			.middleware(async ({ next }) => {
				expect(order++).toBe(1)
				return next()
			})
			.middleware(async ({ next }) => {
				expect(order++).toBe(2)
				return next()
			})

		const execute = action.execute(async () => {})

		await execute()

		expect(action._def.middlewares).toHaveLength(3)
		expect(order).toBe(3)
	})

	it("should contain 3 middlewares and all opts undefined", async () => {
		const action = createActionBuilder<unknown, unknown>()
			.middleware(async ({ ctx, input, meta, next, rawInput }) => {
				expect(ctx).toBeUndefined()
				expect(input).toBeUndefined()
				expect(meta).toBeUndefined()
				expect(rawInput).toBeUndefined()
				return next()
			})
			.middleware(async ({ ctx, input, meta, next, rawInput }) => {
				expect(ctx).toBeUndefined()
				expect(input).toBeUndefined()
				expect(meta).toBeUndefined()
				expect(rawInput).toBeUndefined()
				return next()
			})
			.middleware(async ({ ctx, input, meta, next, rawInput }) => {
				expect(ctx).toBeUndefined()
				expect(input).toBeUndefined()
				expect(meta).toBeUndefined()
				expect(rawInput).toBeUndefined()
				return next()
			})

		expect(action._def.middlewares).toHaveLength(3)
	})

	it("should contain 3 middlewares and all opts defined", async () => {
		const values = { name: "John", age: 25, email: "john@email.com" }

		const action = createActionBuilder<typeof contextSync, typeof metaValues>({
			meta: metaValues,
			defaultContext: contextSync
		})
			.input(z.object({ name: z.string() }))
			.input(z.object({ age: z.number() }))
			.input(z.object({ email: z.string() }))
			.middleware(async ({ ctx, input, meta, next, rawInput }) => {
				expect(ctx).toEqual(contextValues)
				expect(input).toEqual(values)
				expect(meta).toEqual(metaValues)
				expect(rawInput).toEqual(values)
				return next()
			})
			.middleware(async ({ ctx, input, meta, next, rawInput }) => {
				expect(ctx).toEqual(contextValues)
				expect(input).toEqual(values)
				expect(meta).toEqual(metaValues)
				expect(rawInput).toEqual(values)
				return next()
			})
			.middleware(async ({ ctx, input, meta, next, rawInput }) => {
				expect(ctx).toEqual(contextValues)
				expect(input).toEqual(values)
				expect(meta).toEqual(metaValues)
				expect(rawInput).toEqual(values)
				return next()
			})
			.execute(async ({ input }) => {
				return input
			})

		const result = await action(values)

		expect(result.data).toEqual(values)
	})

	it("should create and modify a context without a default context", async () => {
		const values = { name: "John", age: 25, email: "john@email.com" }

		const action = createActionBuilder<unknown, unknown>()
			.middleware(async ({ next }) => {
				return next({ ctx: { name: values.name } })
			})
			.middleware(async ({ next }) => {
				return next({ ctx: { age: values.age } })
			})
			.middleware(async ({ next }) => {
				return next({ ctx: { email: values.email } })
			})
			.execute(async ({ ctx }) => {
				return ctx
			})

		const result = await action()

		expect(result.data).toEqual(values)
	})

	it("should create and modify a context with a default context", async () => {
		const values = { ...contextValues, name: "John", age: 25, email: "john@email.com" }

		const action = createActionBuilder<typeof contextSync, unknown>({
			defaultContext: contextSync
		})
			.middleware(async ({ next }) => {
				return next({ ctx: { name: values.name } })
			})
			.middleware(async ({ next }) => {
				return next({ ctx: { age: values.age } })
			})
			.middleware(async ({ next }) => {
				return next({ ctx: { email: values.email } })
			})
			.execute(async ({ ctx }) => {
				return ctx
			})

		const result = await action()

		expect(result.data).toEqual(values)
	})

	it("should handle errors in the middlewares", async () => {
		const errorBultinObj = {
			code: "ERROR",
			cause: undefined,
			message: "Middleware error"
		}

		const jsonErrorObj = {
			code: "BAD_REQUEST",
			cause: undefined,
			message: "Bad request"
		}

		const action1 = createActionBuilder<unknown, unknown>().middleware(async () => {
			throw new Error("Middleware error")
		})

		const action2 = createActionBuilder<unknown, unknown>().middleware(async () => {
			throw new ActionError({ code: "BAD_REQUEST" })
		})

		const execute1 = action1.execute(async () => {})
		const execute2 = action2.execute(async () => {})

		const result1 = await execute1()
		const result2 = await execute2()

		expect(result1.error).toEqual(errorBultinObj)
		expect(result2.error).toEqual(jsonErrorObj)
	})

	it("should handle errors in the action", async () => {
		const errorBultinObj = {
			code: "ERROR",
			cause: undefined,
			message: "Action error"
		}

		const jsonErrorObj = {
			code: "BAD_REQUEST",
			cause: undefined,
			message: "Bad request"
		}

		const action1 = createActionBuilder<unknown, unknown>().execute(async () => {
			throw new Error("Action error")
		})

		const action2 = createActionBuilder<unknown, unknown>().execute(async () => {
			throw new ActionError({ code: "BAD_REQUEST" })
		})

		const result1 = await action1()
		const result2 = await action2()

		expect(result1.error).toEqual(errorBultinObj)
		expect(result2.error).toEqual(jsonErrorObj)
	})
})
