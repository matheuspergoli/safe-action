import { executeHook, executeHooks } from "./hooks"

const opts = {
	input: { age: 25 },
	rawInput: { age: 25 },
	meta: { span: "span" },
	ctx: { user: { name: "John" } }
}

describe("hooks", () => {
	it("should execute hook", async () => {
		const hook = vi.fn()
		await executeHook(hook, opts)
		expect(hook).toBeCalledWith(opts)
	})

	it("should execute hooks", async () => {
		const hook1 = vi.fn()
		const hook2 = vi.fn()
		const hook3 = vi.fn()
		await executeHooks([hook1, hook2, hook3], opts)
		expect(hook1).toBeCalledWith(opts)
		expect(hook2).toBeCalledWith(opts)
		expect(hook3).toBeCalledWith(opts)
	})

	it("should execute hooks in order", async () => {
		let callOrder = 0
		const hook1 = vi.fn(() => {
			expect(callOrder++).toBe(0)
		})
		const hook2 = vi.fn(() => {
			expect(callOrder++).toBe(1)
		})
		const hook3 = vi.fn(() => {
			expect(callOrder++).toBe(2)
		})

		await executeHooks([hook1, hook2, hook3], opts)
	})
})
