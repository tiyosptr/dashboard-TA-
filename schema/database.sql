saya disini sudah menginstall orm prisma. berikan saya kode yang dimana saya dapat menghandler semuanya pada folder ini, bisa di handle di server side render, di client side render, dan bisa handle di supabase nya langsung jadi tinggal migrate saja. saya sudah ada beberapa table yang sudah saya buat dengan nama database dashboard(TA).
create table public.actual_output (
  id bigserial not null,
  line_id uuid null,
  shift_number integer null default 1,
  hour_slot text null,
  output numeric null default 0,
  reject numeric null default 0,
  target_output numeric null default 1000,
  date date null default CURRENT_DATE,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  pn text null,
  constraint actual_output_pkey primary key (id),
  constraint actual_output_line_id_shift_number_hour_slot_date_pn_key unique (line_id, shift_number, hour_slot, date, pn)
) TABLESPACE pg_default;

create index IF not exists idx_actual_output_pn on public.actual_output using btree (pn) TABLESPACE pg_default;

create index IF not exists idx_actual_output_line_shift on public.actual_output using btree (line_id, shift_number, date) TABLESPACE pg_default;

create index IF not exists idx_actual_output_hour on public.actual_output using btree (hour_slot) TABLESPACE pg_default;

create table public.data_items (
  sn text not null,
  id bigint null,
  pn text null,
  wo text null,
  name_line text null,
  process_id uuid null default gen_random_uuid (),
  line_id uuid null,
  name_process text null,
  status text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint data_items_pkey primary key (sn),
  constraint data_items_status_check check (
    (
      status = any (array['pass'::text, 'reject'::text])
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_data_items_pn on public.data_items using btree (pn) TABLESPACE pg_default;
create table public.line (
  id uuid not null default gen_random_uuid (),
  name text null,
  status text null,
  total_running_hours numeric null,
  process_id uuid null default gen_random_uuid (),
  name_process text null,
  constraint line_pkey primary key (id)
) TABLESPACE pg_default;
create table public.machine (
  id uuid not null default gen_random_uuid (),
  name_machine text null,
  name_line text null,
  status text null,
  next_maintenance timestamp without time zone null,
  last_maintenance timestamp without time zone null,
  total_running_hours text null,
  name_process text null,
  process_id uuid null default gen_random_uuid (),
  line_id uuid null default gen_random_uuid (),
  constraint machine_pkey primary key (id)
) TABLESPACE pg_default;
create table public.note (
  id uuid not null default gen_random_uuid (),
  work_order_id uuid null default gen_random_uuid (),
  text text null,
  author text null,
  timestamp timestamp without time zone null,
  constraint note_pkey primary key (id),
  constraint note_work_order_id_fkey foreign KEY (work_order_id) references work_order (id)
) TABLESPACE pg_default;
create table public.notification (
  id uuid not null default gen_random_uuid (),
  type text null,
  severity text null,
  machine_id uuid null default gen_random_uuid (),
  machine_name text null,
  messages text null,
  read text null,
  acknowladged text null,
  acknowladged_by text null,
  acknowladged_at timestamp without time zone null,
  duration text null,
  start_at timestamp without time zone null,
  done_at timestamp without time zone null,
  constraint notification_pkey primary key (id),
  constraint notification_machine_id_fkey foreign KEY (machine_id) references machine (id)
) TABLESPACE pg_default;
create table public.process (
  id uuid not null default gen_random_uuid (),
  name text null,
  line_id uuid null default gen_random_uuid (),
  name_line text null,
  index numeric null,
  constraint process_pkey primary key (id)
) TABLESPACE pg_default;
create table public.task (
  id uuid not null default gen_random_uuid (),
  work_order_id uuid null default gen_random_uuid (),
  description text null,
  completed text null,
  completed_at text null,
  constraint task_pkey primary key (id),
  constraint task_work_order_id_fkey foreign KEY (work_order_id) references work_order (id)
) TABLESPACE pg_default;
create table public.technician (
  id uuid not null default gen_random_uuid (),
  name text null,
  specialization text null,
  contact_info text null,
  is_active boolean null,
  constraint technician_pkey primary key (id)
) TABLESPACE pg_default;
create table public.work_order (
  id uuid not null default gen_random_uuid (),
  type text null,
  priority text null,
  machine_id uuid null default gen_random_uuid (),
  machine_name text null,
  line_id uuid null default gen_random_uuid (),
  name_line text null,
  status text null,
  assigned_to text null,
  created_at timestamp without time zone null,
  schedule_date timestamp without time zone null,
  completed_at timestamp without time zone null,
  estimated_duration text null,
  actual_duration text null,
  description text null,
  work_order_code text null,
  constraint work_order_pkey primary key (id),
  constraint work_order_machine_id_fkey foreign KEY (machine_id) references machine (id)
) TABLESPACE pg_default;