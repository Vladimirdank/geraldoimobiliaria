-- Incremental workspace migration. Apply after initial_portal.
begin;
alter table geraldo.leads
 add column assignee text not null default '' check(length(assignee)<=100),
 add column priority text not null default 'Normal' check(priority in ('Normal','Alta')),
 add column next_action text not null default '' check(length(next_action)<=300),
 add column next_action_at timestamptz,
 add column first_contact_at timestamptz,
 add column lost_reason text not null default '' check(length(lost_reason)<=500),
 add column consent_at timestamptz,
 add column consent_version text not null default '';
create index leads_pipeline on geraldo.leads(status,created_at desc);
create index leads_schedule on geraldo.leads(next_action_at) where next_action_at is not null;
create table geraldo.lead_activities(
 id uuid primary key default gen_random_uuid(),
 lead_id uuid not null references geraldo.leads(id) on delete cascade,
 kind text not null check(kind in ('update','note')),
 body text not null check(length(body) between 1 and 4000),
 actor_id uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create index lead_activities_parent on geraldo.lead_activities(lead_id,created_at desc);
alter table geraldo.lead_activities enable row level security;
grant select,insert on geraldo.lead_activities to authenticated;
create policy admin_read on geraldo.lead_activities for select to authenticated using((select geraldo_private.is_admin()));
create policy admin_insert on geraldo.lead_activities for insert to authenticated with check((select geraldo_private.is_admin()) and actor_id=(select auth.uid()));
create function geraldo.save_lead_workflow(document jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare old_row geraldo.leads; moment timestamptz:=clock_timestamp(); changes text[]:='{}'; is_closed boolean;
begin
 if not geraldo_private.is_admin() then raise exception 'Admin required';end if;
 select * into old_row from geraldo.leads where id=(document->>'id')::uuid for update;
 if not found then raise exception 'NOT_FOUND';end if;
 if old_row.updated_at<>(document->>'expected_updated_at')::timestamptz then raise exception 'CONFLICT';end if;
 if document->>'status'='Perdido' and length(trim(coalesce(document->>'lost_reason','')))=0 then raise exception 'Motivo da perda obrigatório';end if;
 if nullif(document->>'next_action_at','') is not null and length(trim(coalesce(document->>'next_action','')))=0 then raise exception 'Próxima ação obrigatória';end if;
 is_closed:=document->>'status' in ('Convertido','Perdido');
 if old_row.status<>document->>'status' then changes:=array_append(changes,'Etapa: '||old_row.status||' → '||(document->>'status'));end if;
 if old_row.assignee<>document->>'assignee' then changes:=array_append(changes,'Responsável: '||coalesce(nullif(document->>'assignee',''),'Não atribuído'));end if;
 if old_row.priority<>document->>'priority' then changes:=array_append(changes,'Prioridade: '||(document->>'priority'));end if;
 if old_row.next_action<>document->>'next_action' or old_row.next_action_at is distinct from (document->>'next_action_at')::timestamptz then changes:=array_append(changes,'Próxima ação: '||case when is_closed then 'Encerrada' else coalesce(nullif(document->>'next_action',''),'Sem ação')||coalesce(' • '||(document->>'next_action_at'),'') end);end if;
 if coalesce((document->>'contacted')::boolean,false) and old_row.first_contact_at is null then changes:=array_append(changes,'Primeiro contato registrado');end if;
 if document->>'status'='Perdido' then changes:=array_append(changes,'Motivo: '||(document->>'lost_reason'));end if;
 update geraldo.leads set status=document->>'status',assignee=document->>'assignee',priority=document->>'priority',
 next_action=case when is_closed then '' else document->>'next_action' end,
 next_action_at=case when is_closed then null else (document->>'next_action_at')::timestamptz end,
 lost_reason=case when document->>'status'='Perdido' then document->>'lost_reason' else '' end,
 first_contact_at=coalesce(old_row.first_contact_at,case when coalesce((document->>'contacted')::boolean,false) then moment end)
 where id=old_row.id;
 if array_length(changes,1)>0 then insert into geraldo.lead_activities(lead_id,kind,body,actor_id,created_at) values(old_row.id,'update',array_to_string(changes,E'\n'),auth.uid(),moment);end if;
 if length(trim(coalesce(document->>'note','')))>0 then insert into geraldo.lead_activities(lead_id,kind,body,actor_id,created_at) values(old_row.id,'note',document->>'note',auth.uid(),moment);end if;
end;$$;
revoke all on function geraldo.save_lead_workflow(jsonb) from public;
grant execute on function geraldo.save_lead_workflow(jsonb) to authenticated;
create function geraldo.admin_overview() returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; pipeline jsonb;
begin
 if not geraldo_private.is_admin() then raise exception 'Admin required';end if;
 select jsonb_build_object('properties',count(*),'published',count(*) filter(where active and status in ('Disponível','Reservado')),'drafts',count(*) filter(where not active),'featured',count(*) filter(where featured)) into result from geraldo.properties;
 select result||jsonb_build_object('leads',count(*),'new_leads',count(*) filter(where status='Novo'),'overdue',count(*) filter(where next_action_at<now() and status not in ('Convertido','Perdido')),'unassigned',count(*) filter(where assignee='' and status not in ('Convertido','Perdido'))) into result from geraldo.leads;
 select coalesce(jsonb_object_agg(status,n),'{}') into pipeline from (select status,count(*) n from geraldo.leads group by status) counts;
 return result||jsonb_build_object('stages',pipeline);
end;$$;
revoke all on function geraldo.admin_overview() from public;
grant execute on function geraldo.admin_overview() to authenticated;

-- Canonical lookup IDs survive renames from the content editor.
create function geraldo_private.sync_content_lookup() returns trigger language plpgsql security invoker set search_path='' as $$
declare table_name text; previous_name text; target_id uuid;
begin
 table_name:=case coalesce(new.kind,old.kind) when 'type' then 'property_types' when 'city' then 'cities' when 'neighborhood' then 'neighborhoods' when 'condominium' then 'condominiums' when 'feature' then 'features' end;
 if table_name is null then return coalesce(new,old);end if;
 if tg_op='DELETE' then execute format('delete from geraldo.%I where name=$1',table_name) using old.title;return old;end if;
 previous_name:=case when tg_op='UPDATE' then old.title else new.title end;
 execute format('select id from geraldo.%I where name=$1',table_name) into target_id using previous_name;
 if target_id is null then execute format('insert into geraldo.%I(id,name) values($1,$2)',table_name) using new.id,new.title;
 else execute format('update geraldo.%I set name=$1 where id=$2',table_name) using new.title,target_id;end if;
 return new;
end;$$;
revoke all on function geraldo_private.sync_content_lookup() from public;
create trigger sync_lookup after insert or update or delete on geraldo.content for each row execute function geraldo_private.sync_content_lookup();
-- Persistent admission control also covers direct Data API submissions.
create table geraldo_private.lead_limits(phone text primary key,hits integer not null,reset_at timestamptz not null);
alter table geraldo_private.lead_limits enable row level security;
create function geraldo_private.guard_lead_submission() returns trigger language plpgsql security definer set search_path='' as $$
declare digits text; hits integer;
begin
 digits:=regexp_replace(new.phone,'[^0-9]','','g');
 if length(digits)<10 or length(digits)>15 then raise exception 'Telefone inválido';end if;
 insert into geraldo_private.lead_limits as limits(phone,hits,reset_at) values(digits,1,now()+interval '15 minutes')
 on conflict(phone) do update set hits=case when limits.reset_at<=now() then 1 else limits.hits+1 end,reset_at=case when limits.reset_at<=now() then now()+interval '15 minutes' else limits.reset_at end returning limits.hits into hits;
 if hits>4 then raise exception 'Limite de solicitações. Aguarde 15 minutos.';end if;
 delete from geraldo_private.lead_limits where reset_at<now()-interval '1 day';
 return new;
end;$$;
revoke all on function geraldo_private.guard_lead_submission() from public;
create trigger guard_lead before insert on geraldo.leads for each row execute function geraldo_private.guard_lead_submission();
commit;
