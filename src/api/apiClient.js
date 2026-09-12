import { apiUrl } from "@/lib/apiBase";

const N = [
  "Announcement","Assignment","AssignmentSubmission","Course","CourseSection","Enrollment",
  "Exam","ExamAttempt","ExamQuestion","Lesson","LessonView","Material","MaterialDownload",
  "ProblemReport","TeacherLink","TeacherProfile","TeacherEvaluation","User",
];

async function readResponse(response) {
  let body = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try { body = await response.json(); } catch { body = null; }
  } else {
    try { body = await response.text(); } catch { body = null; }
  }
  if (!response.ok) {
    const message = body?.message || body?.error || (typeof body === "string" ? body : `فشل الطلب (${response.status})`);
    const error = new Error(message);
    error.status = response.status;
    error.data = body;
    error.code = body?.code;
    throw error;
  }
  return body;
}

function getDemoRoleHeader() {
  try {
    const role = String(localStorage.getItem("lurnova_demo_session_v1") || "").toUpperCase();
    return role === "TEACHER" || role === "STUDENT" ? role : "";
  } catch {
    return "";
  }
}

async function jsonFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const demoRole = getDemoRoleHeader();
  if (demoRole) headers.set("X-Lurnova-Demo-Role", demoRole);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(apiUrl(path), {
    credentials: "include", cache: options.cache || "no-store", ...options, headers,
  });
  return readResponse(response);
}

const queryString = (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") q.set(key, String(value));
  });
  const result = q.toString();
  return result ? `?${result}` : "";
};

const entity = (name) => ({
  async list(sort = "-created_date", limit = 100) {
    const result = await jsonFetch(`/api/entities/${encodeURIComponent(name)}${queryString({ sort, limit })}`);
    return Array.isArray(result?.items) ? result.items : [];
  },
  async filter(filters = {}, sort, limit = 100) {
    const result = await jsonFetch(`/api/entities/${encodeURIComponent(name)}${queryString({ ...filters, sort, limit })}`);
    return Array.isArray(result?.items) ? result.items : [];
  },
  async get(id) { const rows = await this.filter({ id }, undefined, 1); return rows[0] || null; },
  async create(data = {}) {
    const result = await jsonFetch(`/api/entities/${encodeURIComponent(name)}`, { method: "POST", body: JSON.stringify(data) });
    return result?.item || null;
  },
  async update(id, data = {}) {
    const result = await jsonFetch(`/api/entities/${encodeURIComponent(name)}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) });
    return result?.item || null;
  },
  async delete(id) { return jsonFetch(`/api/entities/${encodeURIComponent(name)}/${encodeURIComponent(id)}`, { method: "DELETE" }); },
});

const functions = {
  async invoke(name, payload = {}) {
    return jsonFetch(`/api/functions/${encodeURIComponent(name)}`, { method: "POST", body: JSON.stringify(payload) });
  },
};

const auth = {
  async me() {
    try {
      const result = await jsonFetch("/api/auth/me");
      return result?.user || null;
    } catch (error) {
      if (error.status === 401) return null;
      throw error;
    }
  },
  async loginViaEmailPassword(email, password) {
    return jsonFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email: String(email || "").trim(), password }) });
  },
  async register({ email, password, full_name, grade }) {
    return jsonFetch("/api/auth/register/start", {
      method: "POST", body: JSON.stringify({ email: String(email || "").trim(), password, full_name, grade }),
    });
  },
  async verifyOtp(email, code) {
    return jsonFetch("/api/auth/otp/verify", { method: "POST", body: JSON.stringify({ email, code }) });
  },
  async resendOtp(email) {
    return jsonFetch("/api/auth/otp/resend", { method: "POST", body: JSON.stringify({ email }) });
  },
  async checkEmail(email) {
    return jsonFetch(`/api/auth/check-email${queryString({ email: String(email || "").trim().toLowerCase() })}`);
  },
  async startPasswordReset(email) {
    return jsonFetch("/api/auth/password-reset/start", { method: "POST", body: JSON.stringify({ email }) });
  },
  async resetPassword(email, code, password) {
    return jsonFetch("/api/auth/password-reset/verify-otp", { method: "POST", body: JSON.stringify({ email, code, password }) });
  },
  async logout() { return jsonFetch("/api/auth/logout", { method: "POST" }); },
  async updateProfile(data) {
    return jsonFetch("/api/auth/me", { method: "PATCH", body: JSON.stringify(data) });
  },
};

export const api = { entities: Object.fromEntries(N.map((name) => [name, entity(name)])), functions, auth };

function uploadFileToServer({ file, onProgress, onStatus, signal, folder = "teacher-files" }) {
  if (!file) throw new Error("لم يتم اختيار ملف.");
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const params = new URLSearchParams({ folder, name: file.name || "file" });
    xhr.open("PUT", apiUrl(`/api/uploads?${params.toString()}`));
    xhr.withCredentials = true;
    const demoRole = getDemoRoleHeader();
    if (demoRole) xhr.setRequestHeader("X-Lurnova-Demo-Role", demoRole);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onloadstart = () => onStatus?.("جارٍ رفع الملف...");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let body = null;
      try { body = JSON.parse(xhr.responseText || "{}"); } catch {}
      if (xhr.status >= 200 && xhr.status < 300) {
        const fileUrl = body?.file?.file_url || body?.file_url || "";
        if (!body?.ok || !fileUrl) {
          const error = new Error(body?.message || "الخادم لم يُرجع رابط الملف بعد الرفع.");
          error.status = xhr.status;
          error.code = "upload-invalid-response";
          error.data = body;
          reject(error);
          return;
        }
        // Do not report success until the exact file URL returned by the
        // upload endpoint is reachable. This prevents a Lesson from being
        // saved with a dead/stale media URL.
        fetch(apiUrl(fileUrl), { method: "HEAD", credentials: "include", cache: "no-store" })
          .then((check) => {
            if (!check.ok) {
              const error = new Error(`تم رفع الملف لكن تعذر الوصول إليه (${check.status}).`);
              error.status = check.status;
              error.code = "upload-file-not-readable";
              error.data = { file_url: fileUrl };
              throw error;
            }
            onProgress?.(100);
            onStatus?.("تم رفع الملف والتحقق منه بنجاح");
            resolve(body);
          })
          .catch((error) => reject(error));
      } else {
        const error = new Error(body?.message || `فشل رفع الملف (${xhr.status}).`);
        error.status = xhr.status;
        error.code = body?.code;
        error.data = body;
        reject(error);
      }
    };
    xhr.onerror = () => reject(new Error("تعذر الاتصال بالخادم أثناء رفع الملف."));
    xhr.onabort = () => reject(Object.assign(new Error("تم إلغاء رفع الملف."), { code: "upload-canceled" }));
    if (signal) signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}
export { uploadFileToServer, getDemoRoleHeader, queryString };
