-- Definição de bootstrap; não aplicada. Ver database/README.md.
begin;
create schema if not exists geraldo;
create schema if not exists geraldo_private;
revoke all on schema geraldo_private from public;
grant usage on schema geraldo to anon, authenticated;
grant usage on schema geraldo_private to anon, authenticated;

create table geraldo.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('admin','viewer')) default 'viewer',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table geraldo.profiles enable row level security;
create policy profile_self on geraldo.profiles for select to authenticated using(id=(select auth.uid()));
grant select on geraldo.profiles to authenticated;

-- Definer limitado ao lookup interno de role: evita recursão de políticas e não aceita IDs externos.
create function geraldo_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from geraldo.profiles where id=auth.uid() and role='admin');
$$;
revoke all on function geraldo_private.is_admin() from public;
grant execute on function geraldo_private.is_admin() to anon, authenticated;
create table geraldo.property_types(id uuid primary key default gen_random_uuid(),name text not null unique,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table geraldo.cities(id uuid primary key default gen_random_uuid(),name text not null unique,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table geraldo.neighborhoods(id uuid primary key default gen_random_uuid(),name text not null unique,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table geraldo.condominiums(id uuid primary key default gen_random_uuid(),name text not null unique,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table geraldo.features(id uuid primary key default gen_random_uuid(),name text not null unique,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table geraldo.properties(
 id uuid primary key default gen_random_uuid(),
 slug text not null unique,
 code text not null unique,
 title text not null,
 description text not null default '',
 short_description text not null default '',
 purpose text not null check(purpose in ('Comprar','Alugar')),
 type_id uuid references geraldo.property_types(id),
 city_id uuid references geraldo.cities(id),
 neighborhood_id uuid references geraldo.neighborhoods(id),
 condominium_id uuid references geraldo.condominiums(id),
 state text not null default 'RN',
 map_mode text not null default 'approximate' check(map_mode in ('exact','approximate','hidden')),
 price numeric not null default 0 check(price>=0),
 condo_fee numeric not null default 0,
 iptu numeric not null default 0,
 show_price boolean not null default true,
 area numeric not null default 0,
 land_area numeric not null default 0,
 bedrooms integer not null default 0,
 suites integer not null default 0,
 bathrooms integer not null default 0,
 parking integer not null default 0,
 floor integer not null default 0,
 year integer not null default 0,
 status text not null default 'Disponível' check(status in ('Disponível','Reservado','Vendido','Alugado')),
 active boolean not null default false,
 featured boolean not null default false,
 tag text not null default '',
 sort_order integer not null default 0,
 financing boolean not null default false,
 fgts boolean not null default false,
 exchange boolean not null default false,
 video text not null default '',
 tour text not null default '',
 seo_title text not null default '',
 seo_description text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index properties_catalog on geraldo.properties(active,status,sort_order);
create index properties_city on geraldo.properties(city_id,type_id);
create table geraldo.property_addresses(id uuid primary key default gen_random_uuid(),property_id uuid not null unique references geraldo.properties(id) on delete cascade,address text not null default '',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table geraldo.property_images(id uuid primary key default gen_random_uuid(),property_id uuid not null references geraldo.properties(id) on delete cascade,url text not null,caption text not null default '',sort_order integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index property_images_parent on geraldo.property_images(property_id,sort_order);
create table geraldo.property_features(property_id uuid references geraldo.properties(id) on delete cascade,feature_id uuid references geraldo.features(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(property_id,feature_id));
create table geraldo.leads(id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 2 and 100),phone text not null check(length(phone) between 10 and 20),email text not null default '',property_id uuid references geraldo.properties(id) on delete set null,origin text not null check(origin in ('contato','imovel','proprietario')),message text not null default '' check(length(message)<=3000),status text not null default 'Novo' check(status in ('Novo','Em atendimento','Visita agendada','Negociação','Convertido','Perdido')),utms jsonb not null default '{}' check(octet_length(utms::text)<5000),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index leads_created on geraldo.leads(created_at desc);
create table geraldo.site_settings(key text primary key,value text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table geraldo.content(id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('faq','testimonial','type','city','neighborhood','condominium','feature')),title text not null,body text not null default '',extra text not null default '',sort_order integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table geraldo.property_types enable row level security;
grant select,insert,update,delete on geraldo.property_types to authenticated;
create policy admin_all on geraldo.property_types for all to authenticated using((select geraldo_private.is_admin())) with check((select geraldo_private.is_admin()));
alter table geraldo.cities enable row level security;
grant select,insert,update,delete on geraldo.cities to authenticated;
create policy admin_all on geraldo.cities for all to authenticated using((select geraldo_private.is_admin())) with check((select geraldo_private.is_admin()));
alter table geraldo.neighborhoods enable row level security;
grant select,insert,update,delete on geraldo.neighborhoods to authenticated;
create policy admin_all on geraldo.neighborhoods for all to authenticated using((select geraldo_private.is_admin())) with check((select geraldo_private.is_admin()));
alter table geraldo.condominiums enable row level security;
grant select,insert,update,delete on geraldo.condominiums to authenticated;
create policy admin_all on geraldo.condominiums for all to authenticated using((select geraldo_private.is_admin())) with check((select geraldo_private.is_admin()));
alter table geraldo.features enable row level security;
grant select,insert,update,delete on geraldo.features to authenticated;
create policy admin_all on geraldo.features for all to authenticated using((select geraldo_private.is_admin())) with check((select geraldo_private.is_admin()));
alter table geraldo.properties enable row level security;
grant select,insert,update,delete on geraldo.properties to authenticated;
create policy admin_all on geraldo.properties for all to authenticated using((select geraldo_private.is_admin())) with check((select geraldo_private.is_admin()));
alter table geraldo.property_addresses enable row level security;
grant select,insert,update,delete on geraldo.property_addresses to authenticated;
create policy admin_all on geraldo.property_addresses for all to authenticated using((select geraldo_private.is_admin())) with check((select geraldo_private.is_admin()));
alter table geraldo.property_images enable row level security;
grant select,insert,update,delete on geraldo.property_images to authenticated;
create policy admin_all on geraldo.property_images for all to authenticated using((select geraldo_private.is_admin())) with check((select geraldo_private.is_admin()));
alter table geraldo.property_features enable row level security;
grant select,insert,update,delete on geraldo.property_features to authenticated;
create policy admin_all on geraldo.property_features for all to authenticated using((select geraldo_private.is_admin())) with check((select geraldo_private.is_admin()));
alter table geraldo.leads enable row level security;
grant select,insert,update,delete on geraldo.leads to authenticated;
create policy admin_all on geraldo.leads for all to authenticated using((select geraldo_private.is_admin())) with check((select geraldo_private.is_admin()));
alter table geraldo.site_settings enable row level security;
grant select,insert,update,delete on geraldo.site_settings to authenticated;
create policy admin_all on geraldo.site_settings for all to authenticated using((select geraldo_private.is_admin())) with check((select geraldo_private.is_admin()));
alter table geraldo.content enable row level security;
grant select,insert,update,delete on geraldo.content to authenticated;
create policy admin_all on geraldo.content for all to authenticated using((select geraldo_private.is_admin())) with check((select geraldo_private.is_admin()));
grant select on geraldo.property_types to anon;
create policy public_read on geraldo.property_types for select to anon,authenticated using(true);
grant select on geraldo.cities to anon;
create policy public_read on geraldo.cities for select to anon,authenticated using(true);
grant select on geraldo.neighborhoods to anon;
create policy public_read on geraldo.neighborhoods for select to anon,authenticated using(true);
grant select on geraldo.condominiums to anon;
create policy public_read on geraldo.condominiums for select to anon,authenticated using(true);
grant select on geraldo.features to anon;
create policy public_read on geraldo.features for select to anon,authenticated using(true);
grant select on geraldo.site_settings to anon;
create policy public_read on geraldo.site_settings for select to anon,authenticated using(true);
grant select on geraldo.content to anon;
create policy public_read on geraldo.content for select to anon,authenticated using(true);
grant select on geraldo.properties to anon;
create policy public_read on geraldo.properties for select to anon,authenticated using(active and status in ('Disponível','Reservado'));
grant select on geraldo.property_addresses to anon;
create policy public_read on geraldo.property_addresses for select to anon,authenticated using(exists(select 1 from geraldo.properties p where p.id=property_id and p.active and p.status in ('Disponível','Reservado') and p.map_mode='exact'));
grant select on geraldo.property_images to anon;
create policy public_read on geraldo.property_images for select to anon,authenticated using(exists(select 1 from geraldo.properties p where p.id=property_id and p.active and p.status in ('Disponível','Reservado')));
grant select on geraldo.property_features to anon;
create policy public_read on geraldo.property_features for select to anon,authenticated using(exists(select 1 from geraldo.properties p where p.id=property_id and p.active and p.status in ('Disponível','Reservado')));
grant insert on geraldo.leads to anon;
create policy lead_submit on geraldo.leads for insert to anon,authenticated with check(status='Novo' and created_at between now()-interval '5 minutes' and now()+interval '1 minute' and (property_id is null or exists(select 1 from geraldo.properties p where p.id=property_id and p.active and p.status in ('Disponível','Reservado'))));

create function geraldo_private.touch_updated_at() returns trigger language plpgsql security invoker set search_path='' as $$ begin new.updated_at=now();return new;end; $$;
create trigger touch_updated before update on geraldo.property_types for each row execute function geraldo_private.touch_updated_at();
create trigger touch_updated before update on geraldo.cities for each row execute function geraldo_private.touch_updated_at();
create trigger touch_updated before update on geraldo.neighborhoods for each row execute function geraldo_private.touch_updated_at();
create trigger touch_updated before update on geraldo.condominiums for each row execute function geraldo_private.touch_updated_at();
create trigger touch_updated before update on geraldo.features for each row execute function geraldo_private.touch_updated_at();
create trigger touch_updated before update on geraldo.properties for each row execute function geraldo_private.touch_updated_at();
create trigger touch_updated before update on geraldo.property_addresses for each row execute function geraldo_private.touch_updated_at();
create trigger touch_updated before update on geraldo.property_images for each row execute function geraldo_private.touch_updated_at();
create trigger touch_updated before update on geraldo.property_features for each row execute function geraldo_private.touch_updated_at();
create trigger touch_updated before update on geraldo.leads for each row execute function geraldo_private.touch_updated_at();
create trigger touch_updated before update on geraldo.site_settings for each row execute function geraldo_private.touch_updated_at();
create trigger touch_updated before update on geraldo.content for each row execute function geraldo_private.touch_updated_at();
create trigger touch_updated before update on geraldo.profiles for each row execute function geraldo_private.touch_updated_at();

-- Transação única: imóvel, endereço, fotos e diferenciais. Sempre executa com a role do chamador.
create function geraldo.save_property(document jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare p geraldo.properties; lookup_id uuid; feature_name text; image jsonb; idx integer:=0;
begin
 if not geraldo_private.is_admin() then raise exception 'Admin required';end if;
 lookup_id:=null;
 if coalesce(document->>'type','')<>'' then
 insert into geraldo.property_types(name) values(document->>'type') on conflict(name) do update set name=excluded.name returning id into lookup_id;
 end if;
 document:=document||jsonb_build_object('type_id',lookup_id);
 lookup_id:=null;
 if coalesce(document->>'city','')<>'' then
 insert into geraldo.cities(name) values(document->>'city') on conflict(name) do update set name=excluded.name returning id into lookup_id;
 end if;
 document:=document||jsonb_build_object('city_id',lookup_id);
 lookup_id:=null;
 if coalesce(document->>'neighborhood','')<>'' then
 insert into geraldo.neighborhoods(name) values(document->>'neighborhood') on conflict(name) do update set name=excluded.name returning id into lookup_id;
 end if;
 document:=document||jsonb_build_object('neighborhood_id',lookup_id);
 lookup_id:=null;
 if coalesce(document->>'condominium','')<>'' then
 insert into geraldo.condominiums(name) values(document->>'condominium') on conflict(name) do update set name=excluded.name returning id into lookup_id;
 end if;
 document:=document||jsonb_build_object('condominium_id',lookup_id);
 p:=jsonb_populate_record(null::geraldo.properties,document);
 insert into geraldo.properties select p.* on conflict(id) do update set
 slug=excluded.slug,
 code=excluded.code,
 title=excluded.title,
 description=excluded.description,
 short_description=excluded.short_description,
 purpose=excluded.purpose,
 type_id=excluded.type_id,
 city_id=excluded.city_id,
 neighborhood_id=excluded.neighborhood_id,
 condominium_id=excluded.condominium_id,
 state=excluded.state,
 map_mode=excluded.map_mode,
 price=excluded.price,
 condo_fee=excluded.condo_fee,
 iptu=excluded.iptu,
 show_price=excluded.show_price,
 area=excluded.area,
 land_area=excluded.land_area,
 bedrooms=excluded.bedrooms,
 suites=excluded.suites,
 bathrooms=excluded.bathrooms,
 parking=excluded.parking,
 floor=excluded.floor,
 year=excluded.year,
 status=excluded.status,
 active=excluded.active,
 featured=excluded.featured,
 tag=excluded.tag,
 sort_order=excluded.sort_order,
 financing=excluded.financing,
 fgts=excluded.fgts,
 exchange=excluded.exchange,
 video=excluded.video,
 tour=excluded.tour,
 seo_title=excluded.seo_title,
 seo_description=excluded.seo_description,
 updated_at=excluded.updated_at;
 insert into geraldo.property_addresses(property_id,address) values(p.id,coalesce(document->>'address','')) on conflict(property_id) do update set address=excluded.address;
 delete from geraldo.property_images where property_id=p.id;
 for image in select * from jsonb_array_elements(document->'images') loop
 insert into geraldo.property_images(property_id,url,caption,sort_order) values(p.id,image#>>'{}',coalesce(document->'captions'->>idx,''),idx);
 idx:=idx+1;
 end loop;
 delete from geraldo.property_features where property_id=p.id;
 for feature_name in select * from jsonb_array_elements_text(document->'features') loop
 insert into geraldo.features(name) values(feature_name) on conflict(name) do update set name=excluded.name returning id into lookup_id;
 insert into geraldo.property_features(property_id,feature_id) values(p.id,lookup_id) on conflict do nothing;
 end loop;
 return p.id;
end; $$;
revoke all on function geraldo.save_property(jsonb) from public;
grant execute on function geraldo.save_property(jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('property-images','property-images',true,12582912,array['image/jpeg','image/png','image/webp','image/avif']);
create policy geraldo_images_read on storage.objects for select to anon,authenticated using(bucket_id='property-images');
create policy geraldo_images_insert on storage.objects for insert to authenticated with check(bucket_id='property-images' and (select geraldo_private.is_admin()));
create policy geraldo_images_update on storage.objects for update to authenticated using(bucket_id='property-images' and (select geraldo_private.is_admin())) with check(bucket_id='property-images' and (select geraldo_private.is_admin()));
create policy geraldo_images_delete on storage.objects for delete to authenticated using(bucket_id='property-images' and (select geraldo_private.is_admin()));

insert into geraldo.site_settings(key,value) values
 ('brand','Geraldo'),('whatsapp',''),('creci',''),('instagram',''),('email',''),('region','Natal e região'),('accent','#b94f24'),('demo','false'),('hero_title',E'Seu próximo capítulo\ncomeça em casa.'),('hero_subtitle','Imóveis selecionados. Conexões verdadeiras.'),('hero_image',''),('about_title',E'Um olhar atento.\nUma escolha que faz sentido.'),('about_body','Cada atendimento começa com uma conversa e cada seleção tem um propósito.'),('gtm',''),('ga4',''),('meta_pixel','');
commit;
