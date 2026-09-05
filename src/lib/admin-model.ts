import type { Content, Lead, Property, Settings } from "@/types";

export const leadStages = [
  "Novo",
  "Em atendimento",
  "Visita agendada",
  "Negociação",
  "Convertido",
  "Perdido",
] as const;
export const adminTabs = [
  "overview",
  "properties",
  "leads",
  "agenda",
  "content",
  "settings",
] as const;
export type AdminTab = (typeof adminTabs)[number];
export type LeadActivity = {
  id: string;
  lead_id: string;
  kind: string;
  body: string;
  actor_id: string;
  created_at: string;
};
export type ManagedLead = Lead & {
  assignee: string;
  priority: string;
  next_action: string;
  next_action_at: string | null;
  first_contact_at: string | null;
  lost_reason: string;
  updated_at: string;
  property_title?: string;
};
export type Overview = {
  properties: number;
  published: number;
  drafts: number;
  featured: number;
  leads: number;
  new_leads: number;
  overdue: number;
  unassigned: number;
  stages: Record<string, number>;
};
export type Workspace = {
  tab: AdminTab;
  page: number;
  pageSize: number;
  total: number;
  properties: Property[];
  leads: ManagedLead[];
  content: Content[];
  settings: Settings;
  overview: Overview | null;
  editing: Property | null;
};
export function publicationIssues(p: Property): string[] {
  const issues: string[] = [];
  if (!p.title.trim() || !p.type.trim() || !p.city.trim())
    issues.push("Preencha título, tipo e cidade.");
  if (!p.description.trim()) issues.push("Adicione a descrição do imóvel.");
  if (
    !p.images.length ||
    p.images.some((url) => !url || url === "/placeholder.svg")
  )
    issues.push("Envie pelo menos uma foto válida.");
  if (p.show_price && p.price <= 0)
    issues.push("Informe o valor ou escolha preço sob consulta.");
  if (p.area <= 0 && p.land_area <= 0)
    issues.push("Informe a área do imóvel ou do terreno.");
  return issues;
}
export const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function csvCell(value: unknown) {
  const text = String(value ?? "").replace(/^[\s\u0000-\u001f]*[=+@-]/, "'$&");
  return `"${text.replace(/"/g, '""')}"`;
}
