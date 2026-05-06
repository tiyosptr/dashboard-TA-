-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.actual_output (
  hour_slot text,
  output text,
  target_output numeric DEFAULT 1000,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  id uuid NOT NULL,
  data_item_id uuid,
  CONSTRAINT actual_output_pkey PRIMARY KEY (id),
  CONSTRAINT actual_output_data_item_id_fkey FOREIGN KEY (data_item_id) REFERENCES public.data_items(id)
);
CREATE TABLE public.ai_prediction_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL,
  line_id uuid,
  line_process_id uuid,
  prediction_time timestamp with time zone DEFAULT now(),
  features jsonb,
  anomaly_score numeric NOT NULL,
  risk_level text CHECK (risk_level = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text])),
  decision text CHECK (decision = ANY (ARRAY['NORMAL'::text, 'WARNING'::text, 'CREATE_WORK_ORDER'::text])),
  confidence numeric,
  notification_id uuid,
  work_order_id uuid,
  actual_outcome text,
  is_correct boolean,
  model_input jsonb,
  model_output jsonb,
  model_version text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_prediction_log_pkey PRIMARY KEY (id),
  CONSTRAINT ai_prediction_log_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notification(id),
  CONSTRAINT ai_prediction_log_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.work_order(id),
  CONSTRAINT ai_prediction_log_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machine(id),
  CONSTRAINT ai_prediction_log_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.line(id),
  CONSTRAINT ai_prediction_log_line_process_id_fkey FOREIGN KEY (line_process_id) REFERENCES public.line_process(id)
);
CREATE TABLE public.availability_line (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  line_id uuid DEFAULT gen_random_uuid(),
  line_process_id uuid DEFAULT gen_random_uuid(),
  actual_availability numeric,
  shift_id uuid DEFAULT gen_random_uuid(),
  machine_status_log_id uuid,
  CONSTRAINT availability_line_pkey PRIMARY KEY (id),
  CONSTRAINT availability_line_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.line(id),
  CONSTRAINT availability_line_line_process_id_fkey FOREIGN KEY (line_process_id) REFERENCES public.line_process(id),
  CONSTRAINT availability_line_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shift(id),
  CONSTRAINT availability_line_machine_status_log_id_fkey FOREIGN KEY (machine_status_log_id) REFERENCES public.machine_status_log(id)
);
CREATE TABLE public.cycle_time_line (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  actual_cycle_time numeric,
  line_id uuid DEFAULT gen_random_uuid(),
  line_process_id uuid DEFAULT gen_random_uuid(),
  shift_id uuid DEFAULT gen_random_uuid(),
  actual_output_id uuid,
  CONSTRAINT cycle_time_line_pkey PRIMARY KEY (id),
  CONSTRAINT cycle_time_line_line_process_id_fkey FOREIGN KEY (line_process_id) REFERENCES public.line_process(id),
  CONSTRAINT cycle_time_line_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shift(id),
  CONSTRAINT cycle_time_line_actual_output_id_fkey FOREIGN KEY (actual_output_id) REFERENCES public.actual_output(id),
  CONSTRAINT cycle_time_line_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.line(id)
);
CREATE TABLE public.cycle_time_machine (
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  id uuid NOT NULL,
  shift_id uuid,
  machine_id uuid,
  line_id uuid,
  line_process_id uuid,
  total_output bigint,
  actual_cycle_time numeric,
  id_machine_status_log uuid,
  CONSTRAINT cycle_time_machine_pkey PRIMARY KEY (id),
  CONSTRAINT cycle_time_machine_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shift(id),
  CONSTRAINT cycle_time_machine_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machine(id),
  CONSTRAINT cycle_time_machine_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.line(id),
  CONSTRAINT cycle_time_machine_id_machine_status_log_fkey FOREIGN KEY (id_machine_status_log) REFERENCES public.machine_status_log(id),
  CONSTRAINT cycle_time_machine_line_process_id_fkey FOREIGN KEY (line_process_id) REFERENCES public.line_process(id)
);
CREATE TABLE public.data_items (
  sn uuid NOT NULL,
  status text CHECK (status = ANY (ARRAY['pass'::text, 'reject'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  id uuid NOT NULL,
  line_process_id uuid,
  CONSTRAINT data_items_pkey PRIMARY KEY (id),
  CONSTRAINT data_items_sn_fkey FOREIGN KEY (sn) REFERENCES public.sn(id),
  CONSTRAINT data_items_line_process_id_fkey FOREIGN KEY (line_process_id) REFERENCES public.line_process(id)
);
CREATE TABLE public.defect_by_process (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  line_id uuid NOT NULL,
  line_process_id uuid NOT NULL,
  shift_id uuid,
  recorded_date date NOT NULL DEFAULT CURRENT_DATE,
  recorded_hour integer,
  total_produced bigint NOT NULL DEFAULT 0 CHECK (total_produced >= 0),
  total_pass bigint NOT NULL DEFAULT 0,
  total_reject bigint NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT defect_by_process_pkey PRIMARY KEY (id),
  CONSTRAINT defect_by_process_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.line(id),
  CONSTRAINT defect_by_process_line_process_id_fkey FOREIGN KEY (line_process_id) REFERENCES public.line_process(id),
  CONSTRAINT defect_by_process_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shift(id)
);
CREATE TABLE public.line (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  status text,
  total_running_hours numeric,
  last_active_at timestamp with time zone,
  CONSTRAINT line_pkey PRIMARY KEY (id)
);
CREATE TABLE public.line_process (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  line_id uuid NOT NULL,
  process_id uuid NOT NULL,
  process_order integer,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT line_process_pkey PRIMARY KEY (id),
  CONSTRAINT line_process_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.line(id),
  CONSTRAINT line_process_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.process(id)
);
CREATE TABLE public.machine (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name_machine text,
  status text,
  next_maintenance timestamp without time zone,
  last_maintenance timestamp without time zone,
  total_running_hours text,
  total_downtime_hours text,
  CONSTRAINT machine_pkey PRIMARY KEY (id)
);
CREATE TABLE public.machine_status_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['active'::text, 'maintenance'::text, 'on hold'::text, 'downtime'::text, 'inactive'::text])),
  start_time timestamp with time zone NOT NULL DEFAULT now(),
  end_time timestamp with time zone,
  duration_seconds bigint DEFAULT 
CASE
    WHEN (end_time IS NOT NULL) THEN (EXTRACT(epoch FROM (end_time - start_time)))::bigint
    ELSE NULL::bigint
END,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  data jsonb,
  CONSTRAINT machine_status_log_pkey PRIMARY KEY (id),
  CONSTRAINT machine_status_log_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machine(id)
);
CREATE TABLE public.note (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  work_order_id uuid DEFAULT gen_random_uuid(),
  text text,
  author text,
  timestamp timestamp without time zone,
  CONSTRAINT note_pkey PRIMARY KEY (id),
  CONSTRAINT note_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.work_order(id)
);
CREATE TABLE public.notification (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text,
  severity text,
  machine_id uuid DEFAULT gen_random_uuid(),
  machine_name text,
  messages text,
  read text,
  acknowladged text,
  acknowladged_by text,
  acknowladged_at timestamp without time zone,
  duration text,
  start_at timestamp without time zone,
  done_at timestamp without time zone,
  process_id uuid,
  work_order_id uuid,
  data jsonb,
  CONSTRAINT notification_pkey PRIMARY KEY (id),
  CONSTRAINT notification_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machine(id),
  CONSTRAINT notification_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.process(id),
  CONSTRAINT notification_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.work_order(id)
);
CREATE TABLE public.oee_line (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  line_id uuid DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  shift_id uuid DEFAULT gen_random_uuid(),
  line_process_id uuid DEFAULT gen_random_uuid(),
  oee_line numeric,
  availability numeric,
  perfomance numeric,
  quality numeric,
  machine_status_log_id uuid,
  updated_at timestamp with time zone,
  actual_output_id uuid,
  CONSTRAINT oee_line_pkey PRIMARY KEY (id),
  CONSTRAINT oee_line_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.line(id),
  CONSTRAINT oee_line_actual_output_id_fkey FOREIGN KEY (actual_output_id) REFERENCES public.actual_output(id),
  CONSTRAINT oee_line_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shift(id),
  CONSTRAINT oee_line_line_process_id_fkey FOREIGN KEY (line_process_id) REFERENCES public.line_process(id),
  CONSTRAINT oee_line_machine_status_log_id_fkey FOREIGN KEY (machine_status_log_id) REFERENCES public.machine_status_log(id)
);
CREATE TABLE public.pn (
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  part_number character varying,
  id uuid NOT NULL,
  line_id uuid,
  CONSTRAINT pn_pkey PRIMARY KEY (id),
  CONSTRAINT pn_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.line(id)
);
CREATE TABLE public.process (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  index numeric,
  machine_id uuid,
  CONSTRAINT process_pkey PRIMARY KEY (id),
  CONSTRAINT process_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machine(id)
);
CREATE TABLE public.shift (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shift_name character varying NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT shift_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sn (
  part_number_id uuid,
  serial_number character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  id uuid NOT NULL,
  CONSTRAINT sn_pkey PRIMARY KEY (id),
  CONSTRAINT sn_part_number_id_fkey FOREIGN KEY (part_number_id) REFERENCES public.pn(id)
);
CREATE TABLE public.task (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  work_order_id uuid DEFAULT gen_random_uuid(),
  description text,
  completed text,
  completed_at text,
  CONSTRAINT task_pkey PRIMARY KEY (id),
  CONSTRAINT task_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.work_order(id)
);
CREATE TABLE public.technician (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  specialization text,
  contact_info text,
  is_active boolean,
  CONSTRAINT technician_pkey PRIMARY KEY (id)
);
CREATE TABLE public.trend_analysis (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  line_id uuid NOT NULL,
  line_process_id uuid,
  shift_id uuid,
  recorded_date date NOT NULL DEFAULT CURRENT_DATE,
  recorded_hour integer CHECK (recorded_hour >= 0 AND recorded_hour <= 23),
  total_output numeric NOT NULL DEFAULT 0,
  total_pass numeric NOT NULL DEFAULT 0,
  total_reject numeric NOT NULL DEFAULT 0,
  quality_rate numeric DEFAULT 
CASE
    WHEN (total_output > (0)::numeric) THEN (total_pass / total_output)
    ELSE (0)::numeric
END,
  efficiency numeric,
  total_downtime_seconds bigint DEFAULT 0,
  downtime_count integer DEFAULT 0,
  planned_time_seconds bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT trend_analysis_pkey PRIMARY KEY (id),
  CONSTRAINT trend_analysis_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.line(id),
  CONSTRAINT trend_analysis_line_process_id_fkey FOREIGN KEY (line_process_id) REFERENCES public.line_process(id),
  CONSTRAINT trend_analysis_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shift(id)
);
CREATE TABLE public.troughput_line (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  line_id uuid DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  line_process_id uuid DEFAULT gen_random_uuid(),
  data_items_id uuid DEFAULT gen_random_uuid(),
  actual_troughput numeric,
  shift_id uuid DEFAULT gen_random_uuid(),
  rate numeric,
  total_pass numeric,
  eff numeric,
  interval_time numeric,
  CONSTRAINT troughput_line_pkey PRIMARY KEY (id),
  CONSTRAINT troughput_line_line_process_id_fkey FOREIGN KEY (line_process_id) REFERENCES public.line_process(id),
  CONSTRAINT troughput_line_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.line(id),
  CONSTRAINT troughput_line_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shift(id),
  CONSTRAINT troughput_line_data_items_id_fkey FOREIGN KEY (data_items_id) REFERENCES public.data_items(id)
);
CREATE TABLE public.troughput_machine (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  troughput numeric,
  total_pass bigint,
  interval_time bigint,
  machine_id uuid,
  line_id uuid,
  line_process_id uuid,
  shift_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  CONSTRAINT troughput_machine_pkey PRIMARY KEY (id),
  CONSTRAINT troughput_machine_line_process_id_fkey FOREIGN KEY (line_process_id) REFERENCES public.line_process(id),
  CONSTRAINT troughput_machine_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machine(id),
  CONSTRAINT troughput_machine_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.line(id),
  CONSTRAINT troughput_machine_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shift(id)
);
CREATE TABLE public.work_order (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text,
  priority text,
  machine_id uuid DEFAULT gen_random_uuid(),
  machine_name text,
  line_id uuid DEFAULT gen_random_uuid(),
  name_line text,
  status text,
  assigned_to text,
  created_at timestamp without time zone,
  schedule_date timestamp without time zone,
  completed_at timestamp without time zone,
  estimated_duration text,
  actual_duration text,
  description text,
  work_order_code text,
  task jsonb,
  data jsonb,
  CONSTRAINT work_order_pkey PRIMARY KEY (id),
  CONSTRAINT work_order_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machine(id),
  CONSTRAINT work_order_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.line(id)
);
CREATE TABLE public.work_order_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL,
  machine_id uuid NOT NULL,
  line_id uuid,
  machine_status_log_id uuid,
  technician_id uuid,
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['maintenance'::text, 'downtime'::text, 'on hold'::text, 'repair'::text])),
  event_start timestamp with time zone NOT NULL,
  event_end timestamp with time zone,
  duration_seconds bigint,
  work_order_status text,
  priority text,
  assigned_to text,
  work_order_code text,
  description text,
  root_cause text,
  action_taken text,
  is_resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  resolved_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  task jsonb,
  data jsonb,
  CONSTRAINT work_order_history_pkey PRIMARY KEY (id),
  CONSTRAINT work_order_history_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machine(id),
  CONSTRAINT work_order_history_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.line(id),
  CONSTRAINT work_order_history_machine_status_log_id_fkey FOREIGN KEY (machine_status_log_id) REFERENCES public.machine_status_log(id),
  CONSTRAINT work_order_history_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES public.technician(id)
);