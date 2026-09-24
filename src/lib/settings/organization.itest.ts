import { describe, it, expect } from "vitest";
import { testAdminClient } from "@/test/integration/helpers";
import { getOrganizationInfo } from "./organization";

describe("organization_info settings (integration)", () => {
  it("round-trips through the settings k/v table", async () => {
    const supabase = testAdminClient();

    const before = await getOrganizationInfo(supabase);

    const { error } = await supabase
      .from("settings")
      .update({ value: { ...before, corporate_name: "Escritório de Teste de Integração" } })
      .eq("key", "organization_info");
    expect(error).toBeNull();

    const after = await getOrganizationInfo(supabase);
    expect(after.corporate_name).toBe("Escritório de Teste de Integração");

    // Restore, so this test never leaves visible garbage in a real setting.
    await supabase.from("settings").update({ value: before }).eq("key", "organization_info");
  });
});
