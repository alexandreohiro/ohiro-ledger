"use server";

import { streamText, convertToModelMessages, UIMessage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY ?? "",
});

const SYSTEM_PROMPT = `Você é o OHIRO-IA, um assistente financeiro pessoal integrado ao Ohiro Ledger.
Sua missão é analisar os dados financeiros do usuário e fornecer insights táticos, alertas e recomendações precisas.

Diretrizes:
- Seja objetivo, direto e use linguagem financeira clara.
- Sempre que possível, cite números e percentuais dos dados fornecidos no contexto.
- Aponte riscos, oportunidades e sugira ações concretas.
- Use formatação Markdown para estruturar respostas longas (negrito, listas, etc.).
- Nunca invente dados — baseie-se apenas no contexto financeiro fornecido.
- Responda sempre em Português do Brasil.
- Quando não houver dados suficientes, peça mais informações ao usuário.

Áreas de expertise:
1. Análise de fluxo de caixa (receitas vs. despesas)
2. Gestão de dívidas e priorização de pagamentos
3. Estratégia de investimentos e diversificação
4. Projeções patrimoniais e metas financeiras
5. Identificação de gastos excessivos por categoria
6. Planejamento de reserva de emergência`;

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, context }: { messages: UIMessage[]; context?: string } = body;

  const systemWithContext = context
    ? `${SYSTEM_PROMPT}\n\n---\n## Dados financeiros atuais do usuário:\n${context}`
    : SYSTEM_PROMPT;

  const result = streamText({
    model: google("gemini-2.0-flash"),
    system: systemWithContext,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 2048,
    temperature: 0.7,
  });

  return result.toUIMessageStreamResponse();
}
