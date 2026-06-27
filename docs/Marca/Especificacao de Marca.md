# Especificação de Marca — Vida Plena Tech

> Fonte canônica da identidade visual. Quando o código (design system / tokens) divergir deste documento, **este documento vence** e o código deve ser corrigido. Decisões registradas na VIRADA 2026-06-27 (ver [`CLAUDE-ZE.md`](../../CLAUDE-ZE.md)).

---

## 1. Identidade

- **Nome:** **Vida Plena Tech** — braço de tecnologia da **Comunidade Vida Plena**.
- **Handle / origem:** `@comunidadevidaplena`.
- **Tagline:** *"uma igreja que se importa"*.
- **Posicionamento visual:** minimalista, premium, alto contraste. Sóbrio e confiável, sem ruído. A marca comunica cuidado por **clareza e foco**, não por ornamento.

---

## 2. Cor

Identidade **monocromática preto & branco**. O contraste P&B é a assinatura da marca — **não há cor de acento**.

| Token | Hex | Uso |
|---|---|---|
| `ink` | `#0F1115` | Fundo escuro / tinta principal. Quase-preto (não `#000`) para reduzir vibração em telas. |
| `paper` | `#FFFFFF` | Fundo claro / tinta sobre escuro. |
| `mist` (cinza) | `#6B7280` *(referência)* | Texto secundário, bordas sutis, estados desabilitados. Único cinza neutro. |

### Regras
- **Sem cor de acento.** Ênfase se faz por peso tipográfico, tamanho, espaço e o contraste P&B — nunca por cor.
- **Cores funcionais (apenas sistema):** permite-se **uma** cor por estado de sistema — sucesso / erro / alerta — restrita a feedback funcional (toasts, validação, badges de status). Nunca decorativa, nunca na marca. Defina-as como tokens semânticos (`--state-success`, `--state-danger`, `--state-warning`), não como paleta de marca.
- Preferir **tema escuro como vitrine** da marca (logo nasce em fundo escuro), mas a identidade funciona nos dois modos.

---

## 3. Tipografia

| Papel | Família | Estilo |
|---|---|---|
| **Títulos / display** | Condensada bold, caixa-alta (estilo **Anton / Oswald**) | Peso forte, condensado, caixa-alta. Assinatura tipográfica da marca. |
| **Tagline** | Mesma condensada ou sans, caixa-alta **leve** com **tracking largo** | Espaçamento entre letras amplo; ar e elegância. |
| **UI / corpo** | **Inter** | Pesos 400–600 para interface e texto longo. Legibilidade. |

### Regras
- Caixa-alta é reservada a **títulos e tagline**. Corpo/UI em caixa normal (Inter).
- Hierarquia por **tamanho + peso**, não por cor.
- Tracking largo só na tagline e em rótulos curtos em caixa-alta; nunca em parágrafos.

---

## 4. Logo

**Marca = "V" de linha tripla dentro de um anel quebrado.**

- O **anel quebrado** (arcos com gaps, pontas arredondadas) envolve um **"V" formado por três linhas paralelas** (chevrons aninhados), também de pontas arredondadas.
- Arte vetorial canônica:
  - [`assets/logo-vidaplena-redesenho.svg`](assets/logo-vidaplena-redesenho.svg) — logo em traço branco, fundo transparente (`viewBox 0 0 200 200`).
  - [`assets/logo-preview-dark.svg`](assets/logo-preview-dark.svg) — mesma marca sobre `#0F1115` (preview de uso em tema escuro).

### Construção
- Anel: `stroke-width` 13 (em viewBox 200), `stroke-linecap: round`, quatro arcos com gaps regulares.
- "V" triplo: três chevrons aninhados, `stroke-width` 6.5, `linecap`/`linejoin` round.
- Cor: monocromática — branco sobre escuro, ou `ink` sobre claro. **Sem preenchimento, só traço.**

### Motivo gráfico (sistema)
O **anel quebrado vira elemento de UI**: usar os arcos/gaps como recurso recorrente — divisores, molduras de avatar, indicadores de progresso, estados de loading, marcações de seção. É o que dá coesão visual além do logo.

### Usos e proibições
- ✅ Manter área de respiro mínima ao redor do logo (≈ largura de um arco).
- ✅ Reduzir traço proporcionalmente em tamanhos pequenos; preferir versão só-ícone como favicon.
- ❌ Não aplicar cor, gradiente ou sombra ao logo.
- ❌ Não preencher o "V" nem fechar os gaps do anel.
- ❌ Não distorcer proporção (sempre quadrado, `viewBox` 1:1).

---

## 5. Tom e princípios

- **Cuidado por clareza.** Menos elementos, mais foco. O usuário (muitas vezes um líder leigo, no domingo) precisa entender de primeira.
- **Premium sem ostentação.** Alto contraste, bom espaçamento, tipografia forte — sensação de produto sério, não corporativo frio.
- **Consistência > novidade.** O sistema (P&B + condensada + anel quebrado) se repete; não se inventa exceção por tela.

---

## 6. Tradução para código (a fazer)

Quando o novo design system for criado (`packages/ui` recomeça do zero — ver VIRADA):

- [ ] Tokens: `ink`, `paper`, `mist` + tokens semânticos de estado (`success`/`danger`/`warning`). **Remover** a antiga paleta Índigo/Âmbar/Sálvia da "Videira".
- [ ] Fontes: carregar Inter (UI) + uma condensada bold (Anton ou Oswald) para display; configurar no tema.
- [ ] Componente `<Logo />` consumindo o SVG canônico; favicon a partir da versão só-ícone.
- [ ] Primitivas que usam o **motivo do anel quebrado** (divisor, progress, moldura).
- [ ] Página `/brand` reconstruída refletindo esta especificação (a antiga era da Videira).
