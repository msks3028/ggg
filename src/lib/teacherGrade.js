export const TEACHER_GRADE_STORAGE_KEY = 'lurnova_teacher_selected_grade';

export function readTeacherGrade() {
  try {
    return localStorage.getItem(TEACHER_GRADE_STORAGE_KEY) || 'all';
  } catch {
    return 'all';
  }
}

export function saveTeacherGrade(value) {
  try {
    localStorage.setItem(TEACHER_GRADE_STORAGE_KEY, value || 'all');
  } catch {
    // Ignore storage restrictions; the page still works in memory.
  }
}
