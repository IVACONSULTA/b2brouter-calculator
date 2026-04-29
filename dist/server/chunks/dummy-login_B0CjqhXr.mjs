const VALID_ROLES = ["admin", "internal", "client", "customer"];
const DUMMY_USERS = {
  admin: { email: "admin@b2brouter.com", name: "Admin User", redirect: "/admin/dashboard" },
  internal: { email: "analyst@b2brouter.com", name: "Sofia Analyst", redirect: "/dashboard" },
  client: { email: "client@acmecorp.com", name: "Carlos Ruiz", redirect: "/dashboard" },
  customer: { email: "customer@example.com", name: "Customer User", redirect: "/dashboard" }
};
const POST = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const role = formData.get("role")?.toString();
  if (!role || !VALID_ROLES.includes(role)) {
    return new Response("Invalid role", { status: 400 });
  }
  const user = DUMMY_USERS[role];
  const dummySession = JSON.stringify({
    role,
    email: user.email,
    name: user.name,
    loggedInAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  cookies.set("session", dummySession, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24
    // 24 hours
  });
  return redirect(user.redirect);
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
