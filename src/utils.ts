export type AnyNonNullish = NonNullable<unknown>

export type Prettify<T> = {
	[K in keyof T]: T[K]
} & AnyNonNullish

export type MaybePromise<T> = Promise<T> | T

export type TypeError<Message extends string> = Message

export const unsetMarker = Symbol("unsetMarker")
export type UnsetMarker = typeof unsetMarker
