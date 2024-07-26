import { CreateActionBuilder } from "./action"
import { ActionError, type JSONError } from "./errors"

const contextValues = { userId: 1 }
const contextSync = () => {
	return contextValues
}
const contextAsync = async () => {
	return contextValues
}
const metaValues = { span: "span" }

describe("CreateAction", () => {
	let createActionBuilder: CreateActionBuilder<unknown, unknown>

	beforeEach(() => {
		createActionBuilder = new CreateActionBuilder()
	})

	it("should create action with meta and no context", () => {
		const action = createActionBuilder.meta(metaValues).create()

		expect(action).toBeDefined()
		expect(action._def.meta).toEqual(metaValues)
	})

	it("should create action with context and no meta", () => {
		const action1 = createActionBuilder.context(contextSync).create()
		const action2 = createActionBuilder.context(contextAsync).create()

		expect(action1).toBeDefined()
		expect(action1._def.defaultContext).toEqual(contextSync)

		expect(action2).toBeDefined()
		expect(action2._def.defaultContext).toEqual(contextAsync)
	})

	it("should create action with no context and no meta", () => {
		const action = createActionBuilder.create()

		expect(action).toBeDefined()
		expect(action._def.meta).toBeUndefined()
		expect(action._def.defaultContext).toBeUndefined()
	})

	it("should create action with context and meta", () => {
		const action1 = createActionBuilder.context(contextSync).meta(metaValues).create()
		const action2 = createActionBuilder.context(contextAsync).meta(metaValues).create()

		expect(action1).toBeDefined()
		expect(action1._def.defaultContext).toEqual(contextSync)
		expect(action1._def.meta).toEqual(metaValues)

		expect(action2).toBeDefined()
		expect(action2._def.defaultContext).toEqual(contextAsync)
		expect(action2._def.meta).toEqual(metaValues)
	})

	it("should create action with error handler and call it", async () => {
		const errorHandler1 = (error: JSONError) => {
			expect(error).toBeDefined()
			expect(error.cause).toBeUndefined()
			expect(error.code).toEqual("ERROR")
			expect(error.message).toEqual("error")
		}

		const errorHandler2 = (error: JSONError) => {
			expect(error).toBeDefined()
			expect(error.cause).toBeUndefined()
			expect(error.code).toEqual("ERROR")
			expect(error.message).toEqual("Error")
		}

		const action1 = createActionBuilder.create({ errorHandler: errorHandler1 })
		const action2 = createActionBuilder.create({ errorHandler: errorHandler2 })

		const execute1 = action1.execute(async () => {
			throw new Error("error")
		})
		const execute2 = action2.execute(async () => {
			throw new ActionError({ code: "ERROR" })
		})

		await execute1()
		await execute2()

		expect(action1).toBeDefined()
		expect(action1._def.errorHandler).toEqual(errorHandler1)

		expect(action2).toBeDefined()
		expect(action2._def.errorHandler).toEqual(errorHandler2)
	})
})
