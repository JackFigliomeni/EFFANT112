-- Automation blocks (src/lib/schema.ts) actually call Claude on their own
-- once a day via cron — unlike tool count or AI generations, this was never
-- safely "unlimited" for Pro, since cost scales with how many automations
-- someone has running regardless of subscription price. Free plan doesn't
-- need this trigger at all: its automations never run on the cron, only via
-- the manual test-run route (capped in application code, not here).
create or replace function public.enforce_automation_limit()
returns trigger as $$
declare
  user_plan text;
  automation_count int;
  limit_count int := 5;
begin
  if new.owner_id is null then
    return new;
  end if;

  select plan into user_plan from public.profiles where id = new.owner_id;
  if coalesce(user_plan, 'free') != 'pro' then
    return new;
  end if;

  select count(*) into automation_count
  from public.tools t, jsonb_array_elements(t.schema->'blocks') b
  where t.owner_id = new.owner_id and t.id != new.id and b->>'type' = 'automation';

  automation_count := automation_count + (
    select count(*) from jsonb_array_elements(new.schema->'blocks') b where b->>'type' = 'automation'
  );

  if automation_count > limit_count then
    raise exception 'Pro plan is limited to % active automations across all your tools — remove one before adding another.', limit_count;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists tools_automation_limit on public.tools;
create trigger tools_automation_limit
  before insert or update on public.tools
  for each row execute function public.enforce_automation_limit();
