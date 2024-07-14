<p align="center">
  <a href="https://github.com/matheuspergoli/safe-action" target="\_parent">
    <img src="https://avatars.githubusercontent.com/u/94739199?v=4" height="150">
  </a>
</p>

<h1 align="center">Simple Type-Safe Actions</h1>

<p align="center">
  <strong>
    Validação estática e runtime para criação de server actions no
    <a href="https://nextjs.org" target="\_parent">NextJS App Router</a>
    com Zod
  </strong>
</p>

### Inicialize suas actions
```ts
// src/server/root.ts
import { prisma } from "your-prisma-instance"
import { getSession } from "your-session-lib"
import { CreateAction, ActionError } from "safe-action"

// Você pode adicionar metadados que serão compartilhados entre os middlewares
// Meta deve ser um objeto
interface Meta {
  span: string
}

// Você pode inicializar o contexto da action
// Deve ser uma função com essas assinaturas: () => object | () => Promise<object>
// ⚠️ Caso não inicialize o contexto inicial, ele irá iniciar um objeto: unknown - vazio
const context = async () => {
  const session = getSession()

  return {
    prisma,
    session
  }
}

const action = CreateAction.meta<Meta>().context<typeof context>().create({
  defaultContext: context,
  defaultMeta: { span: "global" },

  // ✅ Todos os erros que forem lançados dentro das actions vão cair aqui também
  errorHandler: (error) => {

    // ⚠️ O objeto error é serializado para poder retornar do server para o client
    console.error(error)
  }
})

export const publicAction = action

export const authedAction = action.middleware(async ({ ctx, next }) => {
  if (!ctx.session) { // ⚠️ Vamos garantir que nessa action tenha uma session
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action"
    })
  }

  // ⚠️ É importante utilizar a função next() para chamar o próximo middleware na stack
  return next({
    ctx: {
      session: ctx.session // ✅ Passamos o contexto adiante inferindo a session
    }
  })
})
```

### Crie uma server action utilizando um Parser de input para validação dos parâmetros
> [!TIP]
> Utilize os métodos `.input()` para validar os parâmetros da server action

> [!IMPORTANT]
> Os métodos de parser só aceitam `ZodObject` então use `z.object()`
>
> É possível encadear os métodos para criar objetos mais complexos
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

  // input terá seu tipo inferido com base nos métodos de parser
  // ✅ input: { name: string; age: number }
  // ✅ ctx: { session: Session }
  .execute(async ({ input, ctx }) => {
  // faça alguma coisa com os dados

    // ✅ retorno inferido automaticamente
    return {
      message: `${input.name} ${input.age}`,
    }
  })
```
### Utilizando um Parser de output para validação do retorno da action
> [!TIP]
> Utilize os métodos `.output()` para validar o retorno da server action

> [!IMPORTANT]
> Os métodos de parser só aceitam `ZodObject` então use `z.object()`
>
> É possível encadear os métodos para criar objetos mais complexos em combinação dos parsers de input
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

  // input terá seu tipo inferido com base nos métodos de parser
  // ✅ input: { name: string; age: number }
  // ✅ ctx: { session: Session }
  .execute(async ({ input, ctx }) => {
  // faça alguma coisa com os dados

  // ✅ retorno inferido com base nos parsers de output
  return {
      age: input.age,
      name: input.name
    }
  })
```

### Adicionando middlewares em uma action
> [!TIP]
> Utilize os métodos `.middleware()` para adicionar middlewares em uma action

> [!IMPORTANT]
> Os middlewares precisam retornar a função next() para seguir com o próximo
>
> É possível encadear os middlewares para criar lógicas mais complexas
>
> [!IMPORTANT]
> Os middlewares tem acesso ao `input`, `meta`, `rawInput` (input ainda não validado) assim como o `ctx` e a função `next` para seguir com a stack
>
> Middlewares podem ser tanto funções assíncronas quanto funções normais
>
> Ex.: `.middleware(async ({ input, rawInput, ctx, next }) => {...})`
```ts
// src/server/user/index.ts
"use server"

import { z } from "zod"
import { authedAction } from "src/server/root.ts"

// ⚠️ por segurança rawInput sempre terá type: unknown por conta de não ser validado
export const myAction = authedAction.middleware(async (opts) => {
  const { meta, input, rawInput, ctx, next } = opts

  // ⚠️ retorne a função next() para prosseguir com a stack de middlewares
  return next()
}).middleware(({ next }) => {
  // ✅ você pode adicionar novas propriedades ao objeto de contexto
  return next({ ctx: { userId: 1 } }) // ✅ ctx: { session: Session, userId: number }
})
```

### Executando uma action em um server component
```ts
// src/app/page.tsx
import { myAction } from "src/server/user"

export default async function Page() {
  // ✅ Parâmetros tipados de acordo com os parsers de input
  const result = await myAction({ name: "John doe", age: 30 })

  return (
    <div>
      {/* ⚠️ Sempre se deve verificar para ter acesso aos dados */}
      {result.success ? (
        <>
          <h1>{result.data.name}</h1>
          <p>{result.data.age}</p>
        </>
      ) : (
        <div>{result.error.message}</div>
      )}
    </div>
  )
}
```
### Executando uma action em um client component
> [!TIP]
> Para utilizar em um client component vamos criar um custom hook
```ts
// src/hooks/index.ts
import React from "react"
import { myAction } from "src/server/user"

// type helper para nos ajudar a pegar os parâmetros de uma action
import { type ActionInput } from "safe-action"

// Vamos utilizar como exemplo o componente toast do shadcn/ui
import { toast } from "sonner"

// Vamos criar um type para os valores que vamos precisar receber na action
type Data = ActionInput<typeof myAction> // ✅ Data = { name: string; age: number }

export const useCustomHook = () => {
  const [isPending, startTransition] = React.useTransition()

  const randomName = ({ name, age }: Data) => {
    startTransition(async () => {
      const result = await myAction({ name, age })

      if (!result.success) {
        // ✅ Você pode mostrar algum alerta ou toast para o usuário
        toast("Algo de errado aconteceu", {
          description: result.error.message
        })

        // ⚠️ return para parar o fluxo assim o resultado de sucesso será inferido
        return
      }

      toast("Action executada com sucesso", {
        description: `Dados recebidos ${result.data.name} ${result.data.age}`
      })
    })
  }

  return { isPending, randomName }
}
```
