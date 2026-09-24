/**
 * Catalog of module keys a permission group can theoretically cover.
 * No screen enforces this yet -- see supabase/migrations/0011_permission_groups.sql.
 */
export interface ModuleDef {
  key: string;
  label: string;
}

export const AVAILABLE_MODULES: ModuleDef[] = [
  { key: "clientes", label: "Clientes" },
  { key: "certificados", label: "Certificados Digitais" },
  { key: "relatorios", label: "Relatórios" },
  { key: "importar", label: "Importar" },
  { key: "usuarios", label: "Usuários" },
  { key: "configuracoes", label: "Configurações" },
];
