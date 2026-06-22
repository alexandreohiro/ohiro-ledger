# Conformidade LGPD — Ohiro Ledger

Documento interno de referência. Última atualização: junho de 2025.

---

## 1. Mapeamento de dados e bases legais

| Tipo de dado | Fonte | Finalidade | Base legal (LGPD Art. 7º) | Retenção |
|---|---|---|---|---|
| E-mail + hash de senha | Cadastro | Autenticação e identificação | Execução de contrato (V) | Enquanto conta ativa |
| Transações, investimentos, dívidas | Input do usuário | Core do produto | Execução de contrato (V) | Enquanto conta ativa |
| Configurações de notificação | Input do usuário | Preferências de alertas | Execução de contrato (V) | Enquanto conta ativa |
| Mensagens enviadas à IA | Input do usuário | Análise por modelo de IA | Consentimento explícito (I) | Não retido — processamento em tempo real |
| Arquivos enviados à IA | Input do usuário | Análise por modelo de IA | Consentimento explícito (I) | Não retido — processamento em tempo real |
| Logs de acesso/erro | Automático | Segurança e diagnóstico | Legítimo interesse (IX) | 30 dias |

---

## 2. Fluxo de dados até o provedor de IA

```
Usuário (Brasil)
   │
   │ HTTPS/TLS
   ▼
Next.js API Route: /api/ai/chat  [Vercel — Edge/Serverless]
   │  Verificações: autenticação, rate limit, sanitização de input
   │
   │  Dados enviados: mensagem do usuário + contexto financeiro anonimizado
   │                  + arquivos opcionais (sem CPF, cartão ou senhas)
   ▼
Provedor de IA (EUA)
   ├── Google Gemini 2.5 Flash (Google LLC)
   ├── OpenAI GPT-4o Mini (OpenAI LLC)
   ├── Anthropic Claude Haiku (Anthropic, PBC)
   └── Groq / Meta Llama 3.3 (Groq, Inc.)
   │
   │  Resposta em streaming
   ▼
Cliente do usuário
```

**Minimização de dados enviados à IA:**
- O contexto financeiro é truncado ao necessário (transações do mês corrente, resumo financeiro agregado).
- Identificadores como `user_id` (UUID) não são enviados ao modelo.
- A prompt instrui o modelo a não solicitar dados pessoais identificáveis.
- Histórico de chat não é persistido no banco de dados — existe apenas na memória da sessão do cliente.

---

## 3. Controle de consentimento para IA

- Campo `ai_consent` (boolean) + `ai_consent_at` (timestamptz) na tabela `user_settings`.
- Consentimento solicitado antes da primeira mensagem via `AiConsentModal`.
- Revogação disponível em Configurações → IA Financeira (toggle).
- Ao revogar: `ai_consent = false`, `ai_consent_at = null` via `saveAiConsent(false)`.
- A rota `/api/ai/chat` pode verificar `ai_consent` antes de processar (implementação futura recomendada).

---

## 4. Direitos do titular implementados

| Direito (Art. 18) | Implementação |
|---|---|
| Confirmação de tratamento | Política de Privacidade pública em `/privacidade` |
| Acesso e portabilidade | `exportUserData()` → JSON via Configurações |
| Correção | Edição inline de transações, investimentos e dívidas |
| Revogação do consentimento para IA | Toggle em Configurações |
| Exclusão (esquecimento) | `deleteAccount()` → `delete_user_account()` SQL com CASCADE |
| Contato com DPO | privacidade@ohiroledger.com |

---

## 5. Medidas de segurança técnica

- **RLS (Row Level Security):** todas as tabelas têm policies `auth.uid() = user_id` para SELECT/INSERT/UPDATE/DELETE.
- **Filtros explícitos:** todas as server actions incluem `.eq('user_id', user.id)` como defesa adicional ao RLS.
- **Rate limiting:** 15 req/min na rota de IA (`ai:userId`), 60 req/min nas actions de mutação (`action:userId`).
- **Sanitização:** `sanitizeMessage()` remove null bytes e caracteres de controle antes de enviar à IA.
- **Validação de arquivos:** tipo MIME + extensão + tamanho (máx. 10 MB, 5 arquivos/req).
- **Headers HTTP:** CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Permissions-Policy.
- **CHECK constraints:** enums validados em banco além de TypeScript.

---

## 6. Responsáveis

| Papel | Pessoa | Contato |
|---|---|---|
| Controlador | Alexandre Ohiro | alexandre@ohiroledger.com |
| DPO (Encarregado) | Alexandre Ohiro | privacidade@ohiroledger.com |
| Operadores de IA | Google, OpenAI, Anthropic, Groq | Ver políticas de cada provedor |
| Infraestrutura | Supabase / Vercel | Ver políticas de cada provedor |

---

## 7. Itens pendentes / roadmap de conformidade

- [ ] Verificar `ai_consent` na rota `/api/ai/chat` e retornar 403 se não concedido.
- [ ] Rate limit distribuído via Redis/Upstash (atual é por processo — suficiente para single-instance).
- [ ] Notificar usuário por e-mail ao receber solicitação de titular (via Supabase Edge Functions).
- [ ] Registro de incidentes (breach notification em até 72h para a ANPD, Art. 48 LGPD).
- [ ] Revisar anualmente este documento e a Política de Privacidade.
