// Escala única de ícones (grade de 4px) e espessura de traço. Usar estes tokens em vez de
// números soltos mantém o ritmo visual igual em todas as telas.
//   xs: dentro de selos/pílulas de 10–12px · sm: ao lado de texto de 12–14px e alertas
//   md: botões e controles de toque · lg: navegação e ilustração de estado vazio
export const ICON = { xs: 12, sm: 16, md: 20, lg: 24 } as const;

// Traço padrão do lucide é 2 (não precisa declarar). `forte` é para checks dentro de
// círculos/selos pequenos, onde 2 some.
export const STROKE = { forte: 2.5 } as const;
