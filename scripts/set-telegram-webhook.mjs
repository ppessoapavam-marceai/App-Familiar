// Aponta o webhook do Telegram para a Edge Function do Supabase.
// Uso: TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... node scripts/set-telegram-webhook.mjs https://SEU-PROJETO.supabase.co
const [, , supabaseUrl] = process.argv
const token = process.env.TELEGRAM_BOT_TOKEN
const secret = process.env.TELEGRAM_WEBHOOK_SECRET

if (!supabaseUrl || !token || !secret) {
  console.error(
    'Uso: TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... node scripts/set-telegram-webhook.mjs https://SEU-PROJETO.supabase.co',
  )
  process.exit(1)
}

const url = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/telegram-webhook`
const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url, secret_token: secret }),
})
const data = await res.json()
console.log(data)
if (!data.ok) process.exit(1)
console.log(`\nWebhook configurado: ${url}`)
