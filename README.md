<p align="center">
  <a href="https://github.com/matheuspergoli/safe-action" target="\_parent">
    <img src="https://avatars.githubusercontent.com/u/94739199?v=4" height="150">
  </a>
</p>

<h1 align="center">Simple Type-Safe Actions</h1>

<p align="center">
  <strong>
    Static type and runtime validation for server actions in
    <a href="https://nextjs.org" target="\_parent">NextJS App Router</a>
    with Zod
  </strong>
</p>

### Initialize your actions
```ts
// src/server/root.ts
import { prisma } from "your-prisma-instance"
import { getSession } from "your-session-lib"
import { CreateAction, ActionError } from "safe-action"

// You can add metadata that will be shared between middlewares and hooks
// Metadata must be an object
// You can always modify the values, but the types will always remain the same from when it was initialized
// ⚠️ If you do not initialize metadata, it will start as undefined: unknown and will remain unknown throughout the action
const meta = {
  event: 'event-test',
  channel: 'channel-test'
}

// You can initialize the action context
// Context must be a function with these signatures: () => object | () => Promise<object>
// ⚠️ If you do not provide the initial context, it will start as undefined: unknown
const context = async () => {
  const session = getSession()

  return {
    prisma,
    session
  }
}

// ✅ Meta and context types will be inferred based on usage
const action = CreateAction.meta(meta).context(context).create({
  // ✅ All errors thrown within actions will be handled here as well
  errorHandler: (error) => {

    // ⚠️ The error object is serialized to return from the server to the client
    console.error(error)
  }
})

export const publicAction = action

export const authedAction = action.middleware(async ({ ctx, next }) => {
  if (!ctx.session) { // ⚠️ Ensure this action has a session
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action"
    })
  }

  // ⚠️ It is important to use the next() function to call the next middleware in the stack
  return next({
    ctx: {
      session: ctx.session // ✅ Pass the context forward, inferring the session
    }
  })
})
```

### Create a server action using an Input Parser for parameter validation
> [!TIP]
> Use the `.input()` methods to validade the server actions parameters

> [!IMPORTANT]
> Parser methods only accepts `ZodObject` so use `z.object()`
>
> You can chain methods to create more complex objects
>
> Ex.: `.input(z.object({ name: z.string() })).input(z.object({ age: z.number() }))`
```ts
// src/server/user/index.ts
"use server"

import { z } from "zod"
import { authedAction } from "src/server/root.ts"

export const myAction = authedAction
  .input(z.object({ name: z.string() }))
  .input(z.object({ age: z.number() }))

  // input will have its type inferred based on the parser methods
  // ✅ input: { name: string; age: number }
  // ✅ ctx: { session: Session }
  .execute(async ({ input, ctx }) => {
  // do something with the data

    // ✅ return inferred automatically
    return {
      message: `${input.name} ${input.age}`,
    }
  })
```

### Using an Output Parser for return validation
> [!TIP]
> Use the `.output()` methods to validate the server action return

> [!IMPORTANT]
> Parser methods only accept `ZodObject` so use `z.object()`
>
> You can chain methods to create more complex objects in combination with input parsers
>
> Ex.: `.output(z.object({ name: z.string() })).output(z.object({ age: z.number() }))`
```ts
// src/server/user/index.ts
"use server"

import { z } from "zod"
import { authedAction } from "src/server/root.ts"

export const myAction = authedAction
  .input(z.object({ name: z.string() }))
  .input(z.object({ age: z.number() }))
  .output(z.object({ name: z.string() }))
  .output(z.object({ age: z.number() }))

  // input will have its type inferred based on the parser methods
  // ✅ input: { name: string; age: number }
  // ✅ ctx: { session: Session }
  .execute(async ({ input, ctx }) => {
  // do something with the data

  // ✅ return inferred based on output parsers
  return {
      age: input.age,
      name: input.name
    }
  })
```

### Adding middlewares to an action
> [!TIP]
> Use the `.middleware()` methods to add middlewares to an action

> [!IMPORTANT]
> Middlewares need to return the next() function to proceed to the next one
>
> You can chain middlewares to create more complex logic
>
> Middlewares have access to `input`, `meta`, `rawInput` (unvalidated input), as well as `ctx` and the `next` function to proceed with the stack
>
> Middlewares can be either asynchronous or regular functions
>
> Ex.: `.middleware(async ({ input, rawInput, ctx, next }) => {...})`
```ts
// src/server/user/index.ts
"use server"

import { z } from "zod"
import { authedAction } from "src/server/root.ts"

// ⚠️ for security, rawInput will always have type: unknown because it is not validated
export const myAction = authedAction.middleware(async (opts) => {
  const { meta, input, rawInput, ctx, next } = opts

  // ⚠️ return the next() function to proceed with the middleware stack
  return next()
}).middleware(({ next }) => {
  // ✅ you can add new properties to the context object
  return next({ ctx: { userId: 1 } }) // ✅ ctx: { session: Session, userId: number }
})
```

### Adding hooks to an action
> [!TIP]
> Use the `.hook()` methods to add hooks to an action

> [!IMPORTANT]
> Hooks run in three different life cycles and have access to values based on their life cycle
> - onSuccess - `ctx` | `meta` | `rawInput` | `input`
> - onError - `ctx` | `meta` `rawInput` | `error`
> - onSettled `ctx` | `meta` | `rawInput`
>
> You can chain hooks of the same life cycle to create more complex logic
>
> Hooks can be either asynchronous or regular functions
>
> Ex.: `.hook('onSuccess', async ({ ctx, meta, input, rawInput }) => {...})`
```ts
// src/server/user/index.ts
"use server"

import { z } from "zod"
import { authedAction } from "src/server/root.ts"

export const myAction = authedAction.hook("onSuccess", async (opts) => {
  const { ctx, meta, input, rawInput } = opts

  // ✅ E.g. You can use hooks to monitor and use logs
  await logger(`User with has logged in with data: ${input}`)
}).hook("onSuccess", ({ rawInput }) => {
  console.log(`Input without validation: ${rawInput}`)
}).hook("onError", async ({ rawInput, error }) => {
  await logger(`User failed to login ${error.message}`)
})
```

### Executing an action in a server component
```ts
// src/app/page.tsx
import { myAction } from "src/server/user"

export default async function Page() {
  // ✅ Parameters typed according to input parsers
  const { data, error } = await myAction({ name: "John doe", age: 30 })

  return (
    <div>
      {/* ⚠️ Always check to access the data */}
      {data ? (
        <>
          <h1>{data.name}</h1>
          <p>{data.age}</p>
        </>
      ) : (
        <div>{error.message}</div>
      )}
    </div>
  )
}
```

### Executing an action in a client component
> [!TIP]
> To use it in a client component, we will create a custom hook
```ts
// src/hooks/index.ts
import React from "react"
import { myAction } from "src/server/user"

// type helper to help us get the parameters of an action
import { type ActionInput } from "safe-action"

// Let's use the shadcn/ui toast component as an example
import { toast } from "sonner"

// Let's create a type for the values we will need to receive in the action
type Data = ActionInput<typeof myAction> // ✅ Data = { name: string; age: number }

export const useCustomHook = () => {
  const [isPending, startTransition] = React.useTransition()

  const randomName = ({ name, age }: Data) => {
    startTransition(async () => {
      const { data, error } = await myAction({ name, age })

      if (error) {
        // ✅ You can show an alert or toast to the user
        toast("Something went wrong", {
          description: error.message
        })

        // ⚠️ return to stop the flow so the success result will be inferred
        return
      }

      toast("Action executed successfully", {
        description: `Data received ${data.name} ${data.age}`
      })
    })
  }

  return { isPending, randomName }
}
```
