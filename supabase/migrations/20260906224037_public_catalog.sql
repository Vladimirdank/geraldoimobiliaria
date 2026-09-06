-- Public search projection: invoker preserves table RLS, including authenticated visitors.
create view geraldo.catalog_search with (security_invoker=true) as
select p.id, p.slug, p.created_at, p.purpose, p.tag, p.bedrooms, p.suites, p.parking, p.area,
  t.name as type, c.name as city, n.name as neighborhood, d.name as condominium,
  case when p.show_price then p.price else null end as visible_price,
  translate(lower(concat_ws(' ',p.title,p.code,c.name,n.name)),
    'áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn') as search_text
from geraldo.properties p
left join geraldo.property_types t on t.id=p.type_id
left join geraldo.cities c on c.id=p.city_id
left join geraldo.neighborhoods n on n.id=p.neighborhood_id
left join geraldo.condominiums d on d.id=p.condominium_id
where p.active and p.status in ('Disponível','Reservado');
grant select on geraldo.catalog_search to anon, authenticated;
create index if not exists properties_public_recent on geraldo.properties(created_at desc,id)
where active and status in ('Disponível','Reservado');
