-- Free plan tightened from 3 tools to 1 — payment is now required after the
-- first project, matching PLAN_LIMITS.free.tools in src/lib/plans.ts.
create or replace function public.enforce_tool_limit()
returns trigger as $$
declare
  user_plan text;
  tool_count int;
  limit_count int;
begin
  if new.owner_id is null then
    return new;
  end if;

  select plan into user_plan from public.profiles where id = new.owner_id;
  limit_count := case coalesce(user_plan, 'free') when 'pro' then 999999 else 1 end;

  select count(*) into tool_count from public.tools where owner_id = new.owner_id;

  if tool_count >= limit_count then
    raise exception 'Free plan is limited to % tool — upgrade to Pro for unlimited.', limit_count;
  end if;

  return new;
end;
$$ language plpgsql;
