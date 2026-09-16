import { describe, it, expect, afterAll } from "vitest";
import { testAdminClient, deleteTestUser } from "@/test/integration/helpers";

// Deliberately not @portalmoreiraecastro.com.br: this must never collide
// with a real account, and generateLink never actually delivers anything
// (that's a separate step our own code does through Resend) -- see
// src/lib/users/actions.ts / src/lib/auth/actions.ts.
const TEST_EMAIL = `integracao-teste-${Date.now()}@example.com`;

describe("Supabase Auth admin invite/recovery links (integration)", () => {
  let createdUserId: string | undefined;

  afterAll(async () => {
    if (createdUserId) await deleteTestUser(createdUserId);
  });

  it("generateLink(invite) creates the auth user and a matching profiles row via the trigger", async () => {
    const admin = testAdminClient();

    const { data, error } = await admin.auth.admin.generateLink({
      type: "invite",
      email: TEST_EMAIL,
      options: {
        data: { full_name: "Usuário de Teste de Integração", role: "user" },
        redirectTo: "http://localhost:3000/auth/callback?next=/definir-senha",
      },
    });

    expect(error).toBeNull();
    expect(data?.properties?.action_link).toBeTruthy();
    expect(data?.user?.id).toBeTruthy();
    createdUserId = data!.user!.id;

    const { data: profile } = await admin.from("profiles").select("full_name, role, email").eq("id", createdUserId).single();
    expect(profile?.full_name).toBe("Usuário de Teste de Integração");
    expect(profile?.role).toBe("user");
    expect(profile?.email).toBe(TEST_EMAIL);
  });

  it("generateLink(recovery) works for that same, now-existing user", async () => {
    const admin = testAdminClient();
    expect(createdUserId).toBeTruthy(); // depends on the invite test above having run first

    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: TEST_EMAIL,
      options: { redirectTo: "http://localhost:3000/auth/callback?next=/definir-senha" },
    });

    expect(error).toBeNull();
    expect(data?.properties?.action_link).toBeTruthy();
  });

  it("deleting the auth user cascades to profiles", async () => {
    const admin = testAdminClient();
    expect(createdUserId).toBeTruthy();

    await deleteTestUser(createdUserId!);
    const { data: profile } = await admin.from("profiles").select("id").eq("id", createdUserId!).maybeSingle();
    expect(profile).toBeNull();

    createdUserId = undefined; // already deleted -- don't try again in afterAll
  });
});
