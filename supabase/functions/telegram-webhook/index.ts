// Recebe as mensagens do Telegram, classifica com a OpenAI e grava no lugar certo.
// Segredos necessários (Supabase > Edge Functions > Secrets):
//   OPENAI_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já são fornecidos automaticamente.

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

type Classified =
  | { kind: "agenda"; title: string; startsAt: string; location?: string; description?: string }
  | { kind: "financeiro"; type: "receita" | "despesa"; amount: number; category: string; description?: string }
  | { kind: "tarefa"; title: string; dueDate?: string; description?: string }
  | { kind: "duvida"; question: string };

const tools = [
  {
    type: "function",
    function: {
      name: "registrar_agenda",
      description:
        "Registra um compromisso na agenda da família (tem dia/hora marcados: reunião, consulta, festa, viagem etc.)",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título curto do compromisso" },
          startsAt: {
            type: "string",
            description: "Data e hora em ISO 8601 sem fuso (ex: 2026-09-26T10:00:00)",
          },
          location: { type: "string" },
          description: { type: "string" },
        },
        required: ["title", "startsAt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "registrar_financeiro",
      description: "Registra uma receita ou despesa financeira",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["receita", "despesa"] },
          amount: { type: "number", description: "Valor em reais, sempre positivo" },
          category: { type: "string", description: "Categoria curta: Mercado, Transporte, Salário, Lazer, Contas..." },
          description: { type: "string" },
        },
        required: ["type", "amount", "category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "registrar_tarefa",
      description: "Registra uma tarefa ou pendência sem hora marcada (comprar algo, resolver algo)",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          dueDate: { type: "string", description: "Prazo em ISO 8601, só se a mensagem citar um prazo" },
          description: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pedir_esclarecimento",
      description: "Use só quando faltar algo essencial (ex: gasto sem valor)",
      parameters: {
        type: "object",
        properties: { question: { type: "string", description: "Pergunta curta em português" } },
        required: ["question"],
      },
    },
  },
];

function upcomingCalendar(now: Date, timezone: string) {
  const dayFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, weekday: "long" });
  const isoFormat = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return Array.from({ length: 15 }, (_, i) => {
    const d = new Date(now.getTime() + i * 86_400_000);
    const label = i === 0 ? " (hoje)" : i === 1 ? " (amanhã)" : "";
    return `${dayFormat.format(d)}: ${isoFormat.format(d)}${label}`;
  }).join("\n");
}

async function classify(text: string, timezone: string): Promise<Classified> {
  const now = new Date();
  const nowLabel = new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: 500,
      tools,
      tool_choice: "required",
      messages: [
        {
          role: "system",
          content: `Você organiza mensagens curtas de membros de uma família para um app doméstico, separando em: agenda (compromissos com data/hora), financeiro (gastos ou receitas) ou tarefas (pendências sem hora marcada).

Agora é: ${nowLabel} (fuso horário: ${timezone}).
Converta datas relativas para ISO 8601 sem sufixo de fuso (ex: 2026-09-26T10:00:00). "Sexta" ou "segunda" sem mais detalhes significa o próximo dia da semana com esse nome; se hoje for esse dia e a hora ainda não passou, é hoje.

Calendário dos próximos dias (use SEMPRE esta tabela para converter nomes de dias em datas, sem calcular):
${upcomingCalendar(now, timezone)}

Regras:
- Pendência sem data/hora marcada (ex: "levar o carro na revisão", "comprar leite") é tarefa. Não peça data nesse caso.
- Compromisso só vai para a agenda se houver dia/hora claros.
- Sempre chame exatamente uma ferramenta. Use pedir_esclarecimento apenas quando faltar algo essencial.`,
        },
        { role: "user", content: text },
      ],
    }),
  });

  if (!res.ok) {
    console.error("OpenAI falhou:", res.status, await res.text());
    return { kind: "duvida", question: "Tive um problema para entender agora. Tenta de novo em instantes?" };
  }

  const data = await res.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) return { kind: "duvida", question: "Não consegui entender, pode detalhar?" };

  let input: Record<string, unknown>;
  try {
    input = JSON.parse(call.function.arguments);
  } catch {
    return { kind: "duvida", question: "Não consegui entender, pode detalhar?" };
  }

  const opt = (v: unknown) => (v ? String(v) : undefined);

  switch (call.function.name) {
    case "registrar_agenda":
      return {
        kind: "agenda",
        title: String(input.title),
        startsAt: String(input.startsAt),
        location: opt(input.location),
        description: opt(input.description),
      };
    case "registrar_financeiro":
      return {
        kind: "financeiro",
        type: input.type === "receita" ? "receita" : "despesa",
        amount: Number(input.amount),
        category: String(input.category),
        description: opt(input.description),
      };
    case "registrar_tarefa":
      return {
        kind: "tarefa",
        title: String(input.title),
        dueDate: opt(input.dueDate),
        description: opt(input.description),
      };
    default:
      return { kind: "duvida", question: opt(input.question) ?? "Pode detalhar melhor?" };
  }
}

// Converte "2026-09-26T10:00:00" (hora local em `timezone`) para o instante UTC correto.
function localToUtc(local: string, timezone: string): Date | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return null;
  const [y, mo, d, h, mi] = [m[1], m[2], m[3], m[4] ?? "12", m[5] ?? "00"].map(Number);
  const wanted = Date.UTC(y, mo - 1, d, h, mi);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const asLocal = (ms: number) => {
    const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  };
  let guess = wanted;
  for (let i = 0; i < 2; i++) guess = wanted - (asLocal(guess) - guess);
  const result = new Date(guess);
  return Number.isNaN(result.getTime()) ? null : result;
}

function formatDateTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function reply(chatId: string, html: string) {
  const res = await fetch(`https://api.telegram.org/bot${Deno.env.get("TELEGRAM_BOT_TOKEN")}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML" }),
  });
  if (!res.ok) console.error("Falha ao responder no Telegram:", await res.text());
}

const ok = () => new Response("ok");

Deno.serve(async (req) => {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== Deno.env.get("TELEGRAM_WEBHOOK_SECRET")) {
    return new Response("unauthorized", { status: 401 });
  }

  const update = await req.json().catch(() => null);
  const text: string | undefined = update?.message?.text?.trim();
  const chatId: string | undefined = update?.message?.chat?.id?.toString();
  if (!text || !chatId) return ok();

  // Vincular: /vincular CODIGO
  if (text.startsWith("/start") || text.startsWith("/vincular")) {
    const code = text.split(/\s+/)[1];
    if (!code) {
      await reply(
        chatId,
        "Para vincular sua conta, gere um código em <b>Configurações</b> no app da família e mande aqui: /vincular SEU_CODIGO",
      );
      return ok();
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("telegram_link_code", code)
      .gt("telegram_link_expires_at", new Date().toISOString())
      .maybeSingle();

    if (!profile) {
      await reply(chatId, "Código inválido ou expirado. Gere um novo em Configurações no app e tente de novo.");
      return ok();
    }

    const { error } = await supabase
      .from("profiles")
      .update({ telegram_chat_id: chatId, telegram_link_code: null, telegram_link_expires_at: null })
      .eq("id", profile.id);

    if (error) {
      await reply(chatId, "Não consegui vincular. Esse Telegram já pode estar ligado a outra conta.");
      return ok();
    }

    await reply(
      chatId,
      `✅ Telegram vinculado à conta de <b>${escapeHtml(profile.name)}</b>!\n\nAgora é só mandar mensagens naturais, tipo:\n"comprei pão por R$8"\n"reunião amanhã às 10h"\n"levar o carro na revisão"`,
    );
    return ok();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, family_id, families(timezone)")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (!profile) {
    await reply(
      chatId,
      "Ainda não conheço você por aqui. Entre no app da família, vá em <b>Configurações</b>, gere um código e mande: /vincular SEU_CODIGO",
    );
    return ok();
  }

  // deno-lint-ignore no-explicit-any
  const timezone: string = (profile.families as any)?.timezone ?? "America/Sao_Paulo";
  const base = { family_id: profile.family_id, user_id: profile.id, source: "telegram" as const };
  const result = await classify(text, timezone);

  if (result.kind === "duvida") {
    await reply(chatId, `🤔 ${escapeHtml(result.question)}`);
    return ok();
  }

  if (result.kind === "agenda") {
    const startsAt = localToUtc(result.startsAt, timezone);
    if (!startsAt) {
      await reply(chatId, "Não entendi a data desse compromisso, pode reformular com uma data mais clara?");
      return ok();
    }
    const { error } = await supabase.from("events").insert({
      ...base,
      title: result.title,
      starts_at: startsAt.toISOString(),
      location: result.location ?? null,
      description: result.description ?? null,
    });
    if (error) {
      console.error(error);
      await reply(chatId, "Não consegui salvar o compromisso agora. Tenta de novo?");
      return ok();
    }
    await reply(
      chatId,
      `📅 Compromisso agendado: <b>${escapeHtml(result.title)}</b>\n🗓 ${formatDateTime(startsAt, timezone)}${
        result.location ? `\n📍 ${escapeHtml(result.location)}` : ""
      }`,
    );
  } else if (result.kind === "financeiro") {
    if (!Number.isFinite(result.amount) || result.amount <= 0) {
      await reply(chatId, "🤔 Qual foi o valor?");
      return ok();
    }
    const { error } = await supabase.from("transactions").insert({
      ...base,
      type: result.type,
      amount: result.amount,
      category: result.category,
      description: result.description ?? null,
    });
    if (error) {
      console.error(error);
      await reply(chatId, "Não consegui salvar o lançamento agora. Tenta de novo?");
      return ok();
    }
    const label = result.type === "despesa" ? "💸 Gasto" : "💰 Receita";
    await reply(
      chatId,
      `${label} registrado: <b>R$ ${result.amount.toFixed(2).replace(".", ",")}</b> — ${escapeHtml(result.category)}`,
    );
  } else {
    const dueDate = result.dueDate ? localToUtc(result.dueDate, timezone) : null;
    const { error } = await supabase.from("tasks").insert({
      ...base,
      title: result.title,
      due_date: dueDate?.toISOString() ?? null,
      description: result.description ?? null,
    });
    if (error) {
      console.error(error);
      await reply(chatId, "Não consegui salvar a tarefa agora. Tenta de novo?");
      return ok();
    }
    await reply(
      chatId,
      `✅ Tarefa adicionada: <b>${escapeHtml(result.title)}</b>${
        dueDate ? `\n⏰ ${formatDateTime(dueDate, timezone)}` : ""
      }`,
    );
  }

  return ok();
});
