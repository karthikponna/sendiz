// Sends one email with the Sendiz TypeScript SDK and waits until it is sent or fails.
//
//   SENDIZ_API_KEY=sdz_... bun examples/send.ts you@example.com
import { DEFAULT_BASE_URL, Sendiz } from '../src/index.ts'

const apiKey = process.env.SENDIZ_API_KEY
if (!apiKey) {
  console.error('set SENDIZ_API_KEY to a key from the Sendiz dashboard')
  process.exit(1)
}
const to = process.argv[2] ?? 'delivered@example.com'

const sendiz = new Sendiz(apiKey, { baseUrl: process.env.SENDIZ_BASE_URL ?? DEFAULT_BASE_URL })

const { id } = await sendiz.emails.send({
  from: 'Sendiz <onboarding@sendiz.dev>',
  to,
  subject: 'Hello World',
  html: '<p>Congrats on sending your <strong>first email</strong>!</p>',
})
console.log('queued:', id)

const deadline = Date.now() + 60_000
while (Date.now() < deadline) {
  const email = await sendiz.emails.get(id)
  if (email.status === 'sent') {
    console.log(`sent after ${email.attempts} attempt(s)`)
    process.exit(0)
  }
  if (email.status === 'failed') {
    console.error('failed:', email.last_error)
    process.exit(1)
  }
  await new Promise((r) => setTimeout(r, 1000))
}
console.error('still not sent after 60s')
process.exit(1)
