-- Preferências visuais/idioma do usuário: tema (claro/escuro/automático,
-- incluindo a paleta "VSCode terminal") e idioma das respostas da IA
-- (o resto da interface continua fixo, só a IA muda de idioma).
alter table public.user_settings
  add column if not exists theme_mode text not null default 'dark'
    check (theme_mode in ('dark', 'light', 'system')),
  add column if not exists theme_palette text not null default 'military'
    check (theme_palette in ('military', 'vscode-terminal')),
  add column if not exists ai_language text not null default 'system'
    check (ai_language in ('pt-BR', 'en', 'system'));
