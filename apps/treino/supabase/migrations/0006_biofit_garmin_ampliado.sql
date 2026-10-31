-- Já aplicada em produção como 'biofit_garmin_ampliado'.
-- Coleta ampliada do Garmin: fases do sono, respiração, SpO2, prontidão, carga, VO2max,
-- baseline de HRV, intensidade e zonas de FC. Colunas novas são todas anuláveis (aditivo).

ALTER TABLE public.biofit_garmin_diario
  ADD COLUMN IF NOT EXISTS sono_profundo_min       integer,
  ADD COLUMN IF NOT EXISTS sono_rem_min            integer,
  ADD COLUMN IF NOT EXISTS sono_leve_min           integer,
  ADD COLUMN IF NOT EXISTS sono_acordado_min       integer,
  ADD COLUMN IF NOT EXISTS sono_inicio_utc         timestamptz,
  ADD COLUMN IF NOT EXISTS sono_fim_utc            timestamptz,
  ADD COLUMN IF NOT EXISTS respiracao_media        numeric,
  ADD COLUMN IF NOT EXISTS spo2_media              numeric,
  ADD COLUMN IF NOT EXISTS spo2_min                numeric,
  ADD COLUMN IF NOT EXISTS vfc_base_baixo_ms       numeric,
  ADD COLUMN IF NOT EXISTS vfc_base_alto_ms        numeric,
  ADD COLUMN IF NOT EXISTS prontidao_score         integer,
  ADD COLUMN IF NOT EXISTS prontidao_nivel         text,
  ADD COLUMN IF NOT EXISTS status_treino           text,
  ADD COLUMN IF NOT EXISTS carga_aguda             numeric,
  ADD COLUMN IF NOT EXISTS carga_cronica           numeric,
  ADD COLUMN IF NOT EXISTS acwr                    numeric,
  ADD COLUMN IF NOT EXISTS vo2max                  numeric,
  ADD COLUMN IF NOT EXISTS minutos_intensidade_mod integer,
  ADD COLUMN IF NOT EXISTS minutos_intensidade_vig integer,
  ADD COLUMN IF NOT EXISTS calorias_ativas         integer,
  ADD COLUMN IF NOT EXISTS calorias_bmr            integer,
  ADD COLUMN IF NOT EXISTS andares                 integer;

ALTER TABLE public.biofit_garmin_treino
  ADD COLUMN IF NOT EXISTS te_aerobico    numeric,
  ADD COLUMN IF NOT EXISTS te_anaerobico  numeric,
  ADD COLUMN IF NOT EXISTS zonas_fc_s     jsonb,     -- [z1..z5] em segundos
  ADD COLUMN IF NOT EXISTS distancia_m    numeric,
  ADD COLUMN IF NOT EXISTS potencia_media numeric;

-- Curvas intradia comprimidas (≈1 ponto/15 min): tipo 'body_battery' | 'estresse'.
-- pontos = [[ts_epoch_ms, valor], ...]
CREATE TABLE IF NOT EXISTS public.biofit_garmin_intraday (
  usuario_id    text        NOT NULL DEFAULT 'bruno',
  data          date        NOT NULL,
  tipo          text        NOT NULL,
  pontos        jsonb       NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, data, tipo)
);
ALTER TABLE public.biofit_garmin_intraday ENABLE ROW LEVEL SECURITY;
