import {
	ActionError,
	DEFAULT_ERROR_MESSAGES,
	getCauseFromUnknown,
	getFormattedError,
	isFailure,
	isSuccess,
	UnknownCauseError,
	type JSONError,
	type Result
} from "./errors"

describe("errors", () => {
	describe("getCauseFromUnknown", () => {
		it("should return undefined for undefined, function, or null", () => {
			expect(getCauseFromUnknown(undefined)).toBeUndefined()
			expect(getCauseFromUnknown(null)).toBeUndefined()
			expect(getCauseFromUnknown(() => {})).toBeUndefined()
		})

		it("should return an Error for non-object values", () => {
			expect(getCauseFromUnknown("string")).toBeInstanceOf(Error)
			expect(getCauseFromUnknown(42)).toBeInstanceOf(Error)
		})

		it("should return the same error if the cause is an instance of Error", () => {
			const error = new Error("Test error")
			expect(getCauseFromUnknown(error)).toBe(error)
		})

		it("should return an UnknownCauseError for objects", () => {
			const cause = { key: "value" }
			const result = getCauseFromUnknown(cause)
			expect(result).toBeInstanceOf(UnknownCauseError)
			expect(result).toHaveProperty("key", "value")
		})
	})

	describe("isSuccess", () => {
		it("should return true if result has data and no error", () => {
			const result: Result<string> = { data: "success", error: null }
			expect(isSuccess(result)).toBe(true)
		})

		it("should return false if result has an error", () => {
			const result: Result<string> = { data: null, error: { code: "ERROR" } as JSONError }
			expect(isSuccess(result)).toBe(false)
		})
	})

	describe("isFailure", () => {
		it("should return true if result has an error and no data", () => {
			const result: Result<string> = { data: null, error: { code: "ERROR" } as JSONError }
			expect(isFailure(result)).toBe(true)
		})

		it("should return false if result has data", () => {
			const result: Result<string> = { data: "success", error: null }
			expect(isFailure(result)).toBe(false)
		})
	})

	describe("ActionError", () => {
		const jsonError: JSONError = {
			code: "NOT_FOUND",
			message: "Not found",
			cause: "Some cause"
		}

		it("should create an instance of ActionError with correct properties", () => {
			const error = new ActionError(jsonError)
			expect(error).toBeInstanceOf(ActionError)
			expect(error.name).toBe("ActionError")
			expect(error.code).toBe("NOT_FOUND")
			expect(error.message).toBe("Not found")
		})

		it("should use default message if no message is provided", () => {
			const error = new ActionError({ code: "NOT_FOUND" })
			expect(error.message).toBe(DEFAULT_ERROR_MESSAGES["NOT_FOUND"])
		})

		it("should set cause correctly", () => {
			const error = new ActionError(jsonError)
			expect(error.cause).toBeUndefined()
		})
	})

	describe("getFormattedError", () => {
		it("should format ActionError correctly", () => {
			const error = new ActionError({ code: "NOT_FOUND" })
			const formattedError = getFormattedError(error)
			expect(formattedError).toEqual({
				code: "NOT_FOUND",
				message: DEFAULT_ERROR_MESSAGES["NOT_FOUND"],
				cause: undefined
			})
		})

		it("should format generic Error correctly", () => {
			const error = new Error("Generic error")
			const formattedError = getFormattedError(error)
			expect(formattedError).toEqual({
				code: "ERROR",
				message: "Generic error",
				cause: undefined
			})
		})

		it("should return default message for unknown error types", () => {
			const formattedError = getFormattedError("Unknown error")
			expect(formattedError).toEqual({
				code: "INTERNAL_ERROR",
				message: "An unexpected error has occurred"
			})
		})
	})
})
