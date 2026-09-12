export const TEACHER_EMAIL = "mostafakareem978@gmail.com";

export const ROLES = {
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
};

export const ROLE_HOME = {
  TEACHER: "/teacher",
  STUDENT: "/student",
};

export const ROLE_LABEL = {
  TEACHER: "المدرّس",
  STUDENT: "الطالب",
};

export function roleForEmail(email = "") {
  return email.trim().toLowerCase() === TEACHER_EMAIL
    ? ROLES.TEACHER
    : ROLES.STUDENT;
}

export function normalizeRole(role) {
  return role === ROLES.TEACHER ? ROLES.TEACHER : ROLES.STUDENT;
}

export function roleHome(role) {
  return ROLE_HOME[normalizeRole(role)] || ROLE_HOME.STUDENT;
}

