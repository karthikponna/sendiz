# Sendiz TypeScript SDK

TypeScript client for the [Sendiz](https://sendiz.dev) email API. No dependencies; works in Node 18+, Bun, Deno, and edge runtimes.

```bash
npm install sendiz
```

```ts
import { Sendiz } from 'sendiz'

const sendiz = new Sendiz('sdz_...') // API key from the dashboard

const { id } = await sendiz.emails.send({
  from: 'Sendiz <onboarding@sendiz.dev>',
  to: 'you@example.com',
  subject: 'Hello World',
  html: '<p>Congrats on sending your <strong>first email</strong>!</p>',
})

const email = await sendiz.emails.get(id)
console.log(email.status) // queued, sending, sent or failed
```

- `sendiz.emails.sendBatch([...])` queues up to 100 emails in one request.
- Errors from the API throw `SendizError` with `statusCode` and `message`.
- Use `new Sendiz(key, { baseUrl: 'http://localhost:8080' })` for a local API.
