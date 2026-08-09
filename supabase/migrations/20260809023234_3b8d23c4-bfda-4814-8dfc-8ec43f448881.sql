CREATE TABLE public.agendamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_key TEXT NOT NULL,
  day_id TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  turma TEXT NOT NULL,
  professor TEXT NOT NULL,
  disciplina TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (week_key, day_id, slot_id)
);

GRANT ALL ON public.agendamentos TO service_role;

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

CREATE INDEX agendamentos_week_key_idx ON public.agendamentos (week_key);