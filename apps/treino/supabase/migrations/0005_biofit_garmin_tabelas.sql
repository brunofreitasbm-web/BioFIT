-- Estado já aplicado em produção (projeto PLAY) antes de o SQL vir para o repo.
-- Alimentadas por biofit_garmin_sync.py -> edge function biofit-garmin-ingest.
-- RLS ligado, sem policies: acesso só pelas funções (service role na ingestão, RPC na leitura).

CREATE TABLE IF NOT EXISTS public.biofit_garmin_diario (
  usuario_id           text        NOT NULL DEFAULT 'bruno',
  data                 date        NOT NULL,
  vfc_noturna_ms       numeric,
  vfc_status           text,
  vfc_media_semanal_ms numeric,
  fc_repouso_bpm       integer,
  sono_minutos         integer,
  sono_score           integer,
  body_battery_acordar integer,
  body_battery_max     integer,
  estresse_medio       integer,
  passos               integer,
  bruto                jsonb,
  atualizado_em        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, data)
);

CREATE TABLE IF NOT EXISTS public.biofit_garmin_treino (
  usuario_id         text        NOT NULL DEFAULT 'bruno',
  garmin_activity_id bigint      NOT NULL,
  inicio_utc         timestamptz NOT NULL,
  tipo               text,
  duracao_s          integer,
  fc_media           integer,
  fc_max             integer,
  calorias           integer,
  biofit_sessao_data date,
  bruto              jsonb,
  atualizado_em      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, garmin_activity_id)
);

ALTER TABLE public.biofit_garmin_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biofit_garmin_treino ENABLE ROW LEVEL SECURITY;
