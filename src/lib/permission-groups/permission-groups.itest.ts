import { describe, it, expect, afterAll } from "vitest";
import { testAdminClient, anyRealProfileId } from "@/test/integration/helpers";
import { listPermissionGroups } from "./queries";

describe("permission groups (integration)", () => {
  let groupId: string | undefined;
  let memberId: string | undefined;
  let memberOriginalGroupId: string | null = null;

  afterAll(async () => {
    const supabase = testAdminClient();
    if (memberId) {
      await supabase.from("profiles").update({ group_id: memberOriginalGroupId }).eq("id", memberId);
    }
    if (groupId) {
      await supabase.from("permission_group_modules").delete().eq("group_id", groupId);
      await supabase.from("permission_groups").delete().eq("id", groupId);
    }
  });

  it("creates a group with modules, assigns a member, and lists it with the right counts", async () => {
    const supabase = testAdminClient();

    const { data: group, error } = await supabase
      .from("permission_groups")
      .insert({ name: "Grupo de Teste de Integração" })
      .select("id")
      .single();
    expect(error).toBeNull();
    groupId = group!.id;

    await supabase
      .from("permission_group_modules")
      .insert([
        { group_id: groupId, module_key: "clientes" },
        { group_id: groupId, module_key: "certificados" },
      ]);

    memberId = await anyRealProfileId();
    const { data: before } = await supabase.from("profiles").select("group_id").eq("id", memberId).single();
    memberOriginalGroupId = before?.group_id ?? null;
    await supabase.from("profiles").update({ group_id: groupId }).eq("id", memberId);

    const groups = await listPermissionGroups(supabase);
    const found = groups.find((g) => g.id === groupId);
    expect(found).toBeTruthy();
    expect(found?.module_keys.sort()).toEqual(["certificados", "clientes"]);
    expect(found?.member_count).toBe(1);
  });

  it("un-assigns members instead of blocking delete when a group is removed", async () => {
    const supabase = testAdminClient();

    const { error } = await supabase.from("permission_groups").delete().eq("id", groupId!);
    expect(error).toBeNull();

    const { data: member } = await supabase.from("profiles").select("group_id").eq("id", memberId!).single();
    expect(member?.group_id).toBeNull();

    groupId = undefined; // already deleted -- don't try again in afterAll
  });
});
