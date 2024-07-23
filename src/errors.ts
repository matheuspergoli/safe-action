import { isNotFoundError } from "next/dist/client/components/not-found"
import { isRedirectError } from "next/dist/client/components/redirect"

import type { MaybePromise } from "./utils"

export type Code =
	| "UNAUTHORIZED"
	| "NOT_FOUND"
	| "INTERNAL_ERROR"
	| "BAD_REQUEST"
	| "FORBIDDEN"
	| "CONFLICT"
	| "ERROR"
	| "TIMEOUT"
	| "PAYLOAD_TOO_LARGE"
	| "TOO_MANY_REQUESTS"
	| "PARSE_INPUT_ERROR"
	| "PARSE_OUTPUT_ERROR"
	| "MIDDLEWARE_ERROR"
	| "NEXT_ERROR"

const DEFAULT_ERROR_MESSAGES: Readonly<Record<Code, string>> = {
	ERROR: "Error",
	TIMEOUT: "Timeout",
	CONFLICT: "Conflict",
	NOT_FOUND: "Not found",
	FORBIDDEN: "Forbidden",
	NEXT_ERROR: "Next error",
	BAD_REQUEST: "Bad request",
	UNAUTHORIZED: "Unauthorized",
	INTERNAL_ERROR: "Internal error",
	MIDDLEWARE_ERROR: "Middleware error",
	PAYLOAD_TOO_LARGE: "Payload too large",
	TOO_MANY_REQUESTS: "Too many requests",
	PARSE_INPUT_ERROR: "Error parsing input",
	PARSE_OUTPUT_ERROR: "Error parsing output"
}

class UnknownCauseError extends Error {
	[key: string]: unknown
}

const isObject = (value: unknown): value is Record<string, unknown> => {
	return !!value && !Array.isArray(value) && typeof value === "object"
}

const getCauseFromUnknown = (cause: unknown): Error | undefined => {
	if (cause instanceof Error) {
		return cause
	}

	const type = typeof cause
	if (type === "undefined" || type === "function" || cause === null) {
		return undefined
	}

	if (type !== "object") {
		return new Error(String(cause))
	}

	if (isObject(cause)) {
		const err = new UnknownCauseError()
		for (const key in cause) {
			err[key] = cause[key]
		}
		return err
	}

	return undefined
}

export type JSONError = {
	code: Code
	message?: string
	cause?: unknown
}

export type Success<T> = {
	success: true
	data: T
}

export type Failure = {
	success: false
	error: JSONError
}

export type Result<T> = [T, null] | [null, JSONError]

export type ErrorHandler = (error: JSONError) => MaybePromise<void>

export const isSuccess = <T>(result: Result<T>): result is [T, null] => {
	return result[1] === null
}

export const isFailure = <T>(result: Result<T>): result is [null, JSONError] => {
	return result[1] !== null
}

export const getFormattedError = (error: unknown): JSONError => {
	if (error instanceof ActionError) {
		return {
			code: error.code,
			cause: error.cause,
			message: error.message
		}
	}

	if (isRedirectError(error) || isNotFoundError(error)) {
		return {
			cause: error,
			code: "NEXT_ERROR",
			message: error.message
		}
	}

	if (error instanceof Error) {
		return {
			code: "ERROR",
			cause: error.cause,
			message: error.message
		}
	}

	return {
		code: "INTERNAL_ERROR",
		message: "An unexpected error has occurred"
	}
}

export class ActionError extends Error {
	public readonly code: Code
	public override readonly cause?: unknown

	constructor(props: JSONError) {
		const cause = getCauseFromUnknown(props.cause)
		const message = props.message ?? cause?.message ?? DEFAULT_ERROR_MESSAGES[props.code]

		super(message, { cause })

		this.name = "ActionError"
		this.code = props.code
	}
}
