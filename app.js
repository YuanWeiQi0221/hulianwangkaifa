const state = {
  me: null,
  students: {
    q: "",
    page: 1,
    pageSize: 10,
    total: 0,
    items: []
  },
  ui: {
    activeTab: "adminLogin",
    toastTimer: null,
    saving: false
  }
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function showToast(message, { ms = 2200 } = {}) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.remove("hidden");
  if (state.ui.toastTimer) window.clearTimeout(state.ui.toastTimer);
  state.ui.toastTimer = window.setTimeout(() => el.classList.add("hidden"), ms);
}

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok || (data && data.ok === false)) {
    const msg = (data && data.error) || `请求失败（${res.status}）`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

function setActiveTab(tab) {
  state.ui.activeTab = tab;
  $$(".tab").forEach((b) => b.classList.toggle("tab--active", b.dataset.tab === tab));
  $$("[data-panel]").forEach((p) => p.classList.toggle("hidden", p.dataset.panel !== tab));
}

function currentRoute() {
  const hash = location.hash || "#/auth";
  const m = hash.match(/^#\/(\w+)/);
  return m ? m[1] : "auth";
}

function setNavVisibility() {
  const role = state.me?.role || null;
  $("#btnLogout").classList.toggle("hidden", !role);
  $("#navAuth").classList.toggle("hidden", !!role);
  $("#navAdmin").classList.toggle("hidden", role !== "admin");
  $("#navStudent").classList.toggle("hidden", role !== "student");
}

function setView(view) {
  $("#viewAuth").classList.toggle("hidden", view !== "auth");
  $("#viewAdmin").classList.toggle("hidden", view !== "admin");
  $("#viewStudent").classList.toggle("hidden", view !== "student");
}

function setButtonsDisabled(disabled) {
  $$("button, input, select").forEach((el) => {
    if (el.id === "btnLogout") return;
    if (el.dataset.keepEnabled === "1") return;
    el.disabled = !!disabled;
  });
}

async function loadMe() {
  try {
    const data = await apiFetch("/api/me", { method: "GET", headers: {} });
    state.me = data.data;
  } catch (e) {
    state.me = { role: null };
  }
  setNavVisibility();
}

function ensureRouteByRole() {
  const role = state.me?.role || null;
  const route = currentRoute();
  if (!role) {
    if (route !== "auth") location.hash = "#/auth";
    setView("auth");
    return;
  }
  if (role === "admin") {
    if (route !== "admin") location.hash = "#/admin";
    setView("admin");
    return;
  }
  if (role === "student") {
    if (route !== "student") location.hash = "#/student";
    setView("student");
    return;
  }
  location.hash = "#/auth";
  setView("auth");
}

function formatValue(v) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function buildKv(info) {
  const entries = [
    ["学号", info.student_no],
    ["姓名", info.name],
    ["性别", info.gender],
    ["年龄", info.age],
    ["班级", info.class_name],
    ["专业", info.major],
    ["电话", info.phone],
    ["邮箱", info.email],
    ["地址", info.address],
    ["创建时间", info.created_at],
    ["更新时间", info.updated_at]
  ];
  return entries
    .map(
      ([k, v]) =>
        `<div class="kv__row"><div class="kv__k">${k}</div><div class="kv__v">${escapeHtml(formatValue(v))}</div></div>`
    )
    .join("");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function loadStudentMe() {
  const data = await apiFetch("/api/student/me", { method: "GET", headers: {} });
  $("#studentInfo").innerHTML = buildKv(data.data);
}

function openModal({ title, student }) {
  $("#modalTitle").textContent = title;
  $("#studentModal").classList.remove("hidden");

  $("#editId").value = student?.id || "";
  $("#editStudentNo").value = student?.student_no || "";
  $("#editName").value = student?.name || "";
  $("#editGender").value = student?.gender || "";
  $("#editAge").value = student?.age ?? "";
  $("#editClassName").value = student?.class_name || "";
  $("#editMajor").value = student?.major || "";
  $("#editPhone").value = student?.phone || "";
  $("#editEmail").value = student?.email || "";
  $("#editAddress").value = student?.address || "";
  $("#editPassword").value = "";
}

function closeModal() {
  $("#studentModal").classList.add("hidden");
}

function renderStudents() {
  const tbody = $("#studentsTbody");
  tbody.innerHTML = "";

  const items = state.students.items || [];
  $("#studentsEmpty").classList.toggle("hidden", items.length !== 0);

  for (const s of items) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(formatValue(s.student_no))}</td>
      <td>${escapeHtml(formatValue(s.name))}</td>
      <td class="th--hideSm">${escapeHtml(formatValue(s.gender))}</td>
      <td class="th--hideSm">${escapeHtml(formatValue(s.age))}</td>
      <td>${escapeHtml(formatValue(s.class_name))}</td>
      <td class="th--hideSm">${escapeHtml(formatValue(s.major))}</td>
      <td>
        <div class="row">
          <button class="btn btnSmall btn--ghost" data-action="edit" data-id="${escapeHtml(s.id)}" type="button">编辑</button>
          <button class="btn btnSmall btnDanger" data-action="del" data-id="${escapeHtml(s.id)}" type="button">删除</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }

  const start = (state.students.page - 1) * state.students.pageSize + 1;
  const end = Math.min(state.students.total, state.students.page * state.students.pageSize);
  const meta =
    state.students.total === 0
      ? "共 0 条"
      : `第 ${state.students.page} 页 · 显示 ${start}-${end} · 共 ${state.students.total} 条`;
  $("#pagerMeta").textContent = meta;
  $("#btnPrev").disabled = state.students.page <= 1;
  $("#btnNext").disabled = state.students.page * state.students.pageSize >= state.students.total;
}

async function loadStudents() {
  const q = state.students.q || "";
  const page = state.students.page || 1;
  const pageSize = state.students.pageSize || 10;
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  const data = await apiFetch(`/api/admin/students?${params.toString()}`, { method: "GET", headers: {} });
  state.students.items = data.data.items;
  state.students.total = data.data.total;
  state.students.page = data.data.page;
  state.students.pageSize = data.data.pageSize;
  renderStudents();
}

async function handleSaveStudent(formEl) {
  if (state.ui.saving) return;
  const fd = new FormData(formEl);
  const payload = Object.fromEntries(fd.entries());
  state.ui.saving = true;
  setButtonsDisabled(true);
  try {
    const isEdit = !!payload.id;
    const body = {
      id: payload.id || undefined,
      studentNo: payload.studentNo,
      name: payload.name,
      gender: payload.gender,
      age: payload.age,
      className: payload.className,
      major: payload.major,
      phone: payload.phone,
      email: payload.email,
      address: payload.address,
      password: payload.password
    };
    const method = isEdit ? "PUT" : "POST";
    await apiFetch("/api/admin/students", { method, body: JSON.stringify(body) });
    showToast("保存成功");
    closeModal();
    await loadStudents();
  } catch (e) {
    showToast(e.message || "保存失败");
  } finally {
    state.ui.saving = false;
    setButtonsDisabled(false);
  }
}

async function handleDeleteStudent(id) {
  const ok = window.confirm("确认删除该学生吗？此操作不可撤销。");
  if (!ok) return;
  setButtonsDisabled(true);
  try {
    await apiFetch(`/api/admin/students?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: {} });
    showToast("删除成功");
    if (state.students.items.length === 1 && state.students.page > 1) state.students.page -= 1;
    await loadStudents();
  } catch (e) {
    showToast(e.message || "删除失败");
  } finally {
    setButtonsDisabled(false);
  }
}

function findStudentById(id) {
  return (state.students.items || []).find((s) => String(s.id) === String(id)) || null;
}

async function init() {
  $$(".tab").forEach((b) => {
    b.addEventListener("click", () => setActiveTab(b.dataset.tab));
  });
  setActiveTab(state.ui.activeTab);

  $("#formAdminLogin").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    setButtonsDisabled(true);
    try {
      await apiFetch("/api/auth/admin/login", { method: "POST", body: JSON.stringify(body) });
      await loadMe();
      ensureRouteByRole();
      if (state.me.role === "admin") {
        $("#adminWelcome").textContent = `管理员：${state.me.username || "admin"}`;
        await loadStudents();
      }
      showToast("登录成功");
    } catch (err) {
      showToast(err.message || "登录失败");
    } finally {
      setButtonsDisabled(false);
    }
  });

  $("#formStudentLogin").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    setButtonsDisabled(true);
    try {
      await apiFetch("/api/auth/student/login", { method: "POST", body: JSON.stringify(body) });
      await loadMe();
      ensureRouteByRole();
      if (state.me.role === "student") await loadStudentMe();
      showToast("登录成功");
    } catch (err) {
      showToast(err.message || "登录失败");
    } finally {
      setButtonsDisabled(false);
    }
  });

  $("#formStudentRegister").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    setButtonsDisabled(true);
    try {
      await apiFetch("/api/auth/student/register", { method: "POST", body: JSON.stringify(body) });
      await loadMe();
      ensureRouteByRole();
      if (state.me.role === "student") await loadStudentMe();
      showToast("注册成功");
    } catch (err) {
      showToast(err.message || "注册失败");
    } finally {
      setButtonsDisabled(false);
    }
  });

  $("#btnLogout").addEventListener("click", async () => {
    setButtonsDisabled(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST", body: "{}" });
      state.me = { role: null };
      setNavVisibility();
      location.hash = "#/auth";
      ensureRouteByRole();
      showToast("已退出");
    } catch (e) {
      showToast(e.message || "退出失败");
    } finally {
      setButtonsDisabled(false);
    }
  });

  $("#btnAddStudent").addEventListener("click", () => openModal({ title: "新增学生", student: null }));
  $("#btnCloseModal").addEventListener("click", closeModal);
  $("#btnCancelModal").addEventListener("click", closeModal);
  $("#studentModal").addEventListener("click", (e) => {
    if (e.target === $("#studentModal")) closeModal();
  });
  $("#formStudentEdit").addEventListener("submit", (e) => {
    e.preventDefault();
    handleSaveStudent(e.currentTarget);
  });

  $("#btnSearch").addEventListener("click", async () => {
    state.students.q = ($("#searchInput").value || "").trim();
    state.students.page = 1;
    try {
      await loadStudents();
      showToast("已更新列表");
    } catch (e) {
      showToast(e.message || "查询失败");
    }
  });

  $("#searchInput").addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    $("#btnSearch").click();
  });

  $("#btnPrev").addEventListener("click", async () => {
    if (state.students.page <= 1) return;
    state.students.page -= 1;
    try {
      await loadStudents();
    } catch (e) {
      showToast(e.message || "加载失败");
    }
  });
  $("#btnNext").addEventListener("click", async () => {
    if (state.students.page * state.students.pageSize >= state.students.total) return;
    state.students.page += 1;
    try {
      await loadStudents();
    } catch (e) {
      showToast(e.message || "加载失败");
    }
  });

  $("#studentsTbody").addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!action || !id) return;
    if (action === "edit") {
      const s = findStudentById(id);
      if (!s) return showToast("未找到学生数据");
      openModal({ title: "编辑学生", student: s });
      return;
    }
    if (action === "del") {
      await handleDeleteStudent(id);
    }
  });

  window.addEventListener("hashchange", async () => {
    await loadMe();
    ensureRouteByRole();
    if (state.me.role === "admin") {
      $("#adminWelcome").textContent = `管理员：${state.me.username || "admin"}`;
      await loadStudents();
    } else if (state.me.role === "student") {
      await loadStudentMe();
    }
  });

  await loadMe();
  ensureRouteByRole();
  if (state.me.role === "admin") {
    $("#adminWelcome").textContent = `管理员：${state.me.username || "admin"}`;
    await loadStudents();
  } else if (state.me.role === "student") {
    await loadStudentMe();
  }
}

init().catch(() => showToast("初始化失败，请刷新页面重试"));
