-- Freemium plans: Free (3 tools, 5 AI generations/month) vs Pro (unlimited
-- tools, 100 AI generations/month, $9/month via Stripe).
alter table public.profiles
  add column if not exists plan text not null default 'free' check (plan in ('free', 'pro')),
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan_status text; -- 'active' | 'canceled' | 'past_due' | null

-- Tool-count limit, enforced the same way as the existing rate-limit
-- triggers (0006/0007) — holds regardless of which client creates the tool.
create or replace function public.enforce_tool_limit()
returns trigger as $$
declare
  user_plan text;
  tool_count int;
  limit_count int;
begin
  -- Pre-auth tools (owner_id null, a legacy path from before Phase 4) skip
  -- this check entirely — there's no plan to look up.
  if new.owner_id is null then
    return new;
  end if;

  select plan into user_plan from public.profiles where id = new.owner_id;
  limit_count := case coalesce(user_plan, 'free') when 'pro' then 999999 else 3 end;

  select count(*) into tool_count from public.tools where owner_id = new.owner_id;

  if tool_count >= limit_count then
    raise exception 'Free plan is limited to % tools — upgrade to Pro for unlimited.', limit_count;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists tools_plan_limit on public.tools;
create trigger tools_plan_limit
  before insert on public.tools
  for each row execute function public.enforce_tool_limit();
