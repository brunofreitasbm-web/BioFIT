# Design Map

Source: https://biofit-treino.vercel.app (tela "Hoje", 1440×900, 1 página analisada)

## Spacing Scale
- Base 8px (45 usos, ~37% dos valores). Escala: 2, 4, 6, 8, 10, 12, 16, 96px
- Fora da grade de 8: 2px (27 usos), 6px (12), 10px (1) — meio-passos de 2px, não grade estrita
- 96px = reserva inferior do container para a barra de abas flutuante
- Método: gap (grid 10px) + margin (section 0 0 16px, h2 0 0 10px)

## Font Hierarchy
- h1 — Barlow Condensed 30px / 800 / line-height 30px
- h2 — Barlow Condensed 16px / 700 / tracking -0.4px
- Botão primário — Barlow 16px / 700
- Título de exercício — Barlow 15px / 600
- Corpo — Barlow 14px / 500 / line-height 20px
- Legenda — Barlow 12px / 500
- Meta — Barlow 11px / 500 (29 dos ~47 nós de texto)
- Escala não modular: 11→12→14→15→16 e salto para 30

## Color Palette
- Fundo da página: #090A11
- Superfície vidro (cards): rgba(24,26,40,0.5), 70.1% da área
- Superfície campo (inputs): #23263A (4% da área)
- Superfície elevada (badges/ícones): #31354E
- Texto primário: #F3F4FA
- Texto secundário: #B2B7CC (23 usos)
- Texto terciário: #9298B0
- Acento: #9482FF (botão primário 5.1% da área; aba ativa)
- Texto sobre acento: #0E0A1F
- Perigo/falha: #FF6B7A texto (7 usos), rgba(248,114,114,0.15) fundo
- Neutros inclinados para azul-violeta (matiz ~230°), sem cinza puro

## Image Ratios
- Nenhuma imagem na tela (images: [])
- Card de exercício expandido: 544×331px = 1.64:1

## Component Tokens
- Radius: 14px (12 elementos, cards), 6px (7, badges), 9999px (5, pílulas/círculos), 8px, 12px, 18px
- Sombra card: 0 12px 32px -14px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.08) — 2 camadas, preto puro + realce branco
- Sombra elevada: 0 16px 40px -12px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.1)
- Grid: container 576px, linha de entrada 3 colunas `1fr 1fr auto` = 225px 225px 48px, gap 10px
- Movimento: transform 0.12s cubic-bezier(.22,1,.36,1); cor/borda 0.15s mesma curva; mola 0.42s cubic-bezier(.34,1.32,.64,1); 1 ocorrência de `transition: all`
- :focus-visible presente; prefers-reduced-motion respeitado

---

# Taste DNA

### One accent, reserved for the next action
- **Trigger**: When a workout screen has dozens of tappable things and the user must find the one that advances the session
- **Decision**: Chose a single violet (#9482FF) on the start button and the active tab over color-coding each muscle group or each control
- **Reason**: Mid-set, the eye should land on "what do I press now" without reading; a second saturated color would make it a search
- **Evidence**: #9482FF fills 5.1% of area (one button); 3 accent text uses vs 23 uses of #B2B7CC; on-accent text #0E0A1F instead of white

### Edge-lit glass cards on blue-tinted blacks
- **Trigger**: When stacking 18+ exercise cards on a near-black background where borders and flat fills disappear or look heavy
- **Decision**: Chose a deep offset shadow plus a 1px inset white highlight on translucent cards over outlined or flat-fill cards
- **Reason**: A lit top edge reads as a physical lip, so cards separate from each other and the background without adding border lines to scan past
- **Evidence**: 7 of 10 shadowed elements use 0 12px 32px -14px rgba(0,0,0,.65) + inset 0 1px rgba(255,255,255,.08), the other 3 vary only in blur and alpha; card fill rgba(24,26,40,.5) covers 70.1% of area; neutrals #090A11/#181A28/#23263A all tilt blue-violet; radius 14px on 12 elements

### Condensed caps for names, plain width for data
- **Trigger**: When workout titles like "A — Upper (peito, costas, ombro, braços + postural)" must fit a 576px column next to numeric inputs
- **Decision**: Chose two widths of one family (Barlow Condensed for h1/h2, Barlow for the other 171 text nodes) over an unrelated display/body pairing
- **Reason**: Condensed heads buy horizontal room and read as gym signage; staying in one family keeps numerals and labels matched in shape
- **Evidence**: h1 30px/800 Barlow Condensed vs body 14px/500 Barlow (2.14×); h2 16px/700 with -0.4px tracking; only 2 families on the page

### Phone column even on desktop (restraint)
- **Trigger**: When the same page is opened on a 1440px desktop but is really used with one thumb between sets
- **Decision**: Chose a fixed 576px single column with a 96px bottom reserve for a floating tab bar over a multi-column desktop dashboard
- **Reason**: The user's context is the phone in the gym; widening the layout would add scanning distance without adding information needed mid-workout
- **Evidence**: container width 576px at 1440 viewport; container padding-bottom 96px; input row grid 225px 225px 48px, gap 10px; 3-item bottom nav, one exercise card expanded at a time
