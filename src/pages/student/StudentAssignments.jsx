import React, { useEffect, useState } from "react";
import { api } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import { gradeMatches } from "@/lib/grades";
import { Link } from "react-router-dom";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, CheckCircle2, Clock, Upload, Award } from "lucide-react";

export default function StudentAssignments() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [subs, setSubs] = useState([]);
  const [slugs, setSlugs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [all, submissions, courses, profiles] = await Promise.all([
          api.entities.Assignment.list("-created_date", 500),
          api.entities.AssignmentSubmission.filter(
            { student_id: user?.id },
            "-created_date",
            500
          ),
          api.entities.Course.list("-created_date", 500),
          api.entities.TeacherProfile.list("-updated_date", 500),
        ]);

        if (!alive) return;

        const courseMap = new Map(courses.map((course) => [course.id, course]));
        const visibleAssignments = all.filter((assignment) =>
          assignment.status === "published" &&
          !assignment.course_id &&
          gradeMatches(
            assignment.target_grade ||
              courseMap.get(assignment.course_id)?.target_grade ||
              "",
            user?.grade
          )
        );

        setItems(visibleAssignments);
        setSubs(submissions.filter((submission) => submission.student_id === user?.id));
        setSlugs(
          Object.fromEntries(
            profiles
              .filter((profile) => profile.teacher_id && profile.slug)
              .map((profile) => [profile.teacher_id, profile.slug])
          )
        );
      } catch (error) {
        console.error("Failed to load student assignments:", error);
        if (alive) {
          setItems([]);
          setSubs([]);
          setSlugs({});
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [user?.id, user?.grade]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="واجباتي"
        description="الواجبات المنشورة لصفك وحالة حلولك ونتائجك"
      />

      {items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="لا توجد واجبات لصفك حاليًا"
          description="أي واجب ينشره المدرس لصفك سيظهر هنا تلقائيًا."
        />
      ) : (
        <div className="space-y-3">
          {items.map((assignment) => {
            const submission = subs.find(
              (item) => item.assignment_id === assignment.id
            );
            const slug = slugs[assignment.teacher_id];
            const returnTo = encodeURIComponent("/student/assignments");
            const target = slug
              ? `/teacher/${slug}/assignment/${assignment.id}?returnTo=${returnTo}`
              : `/student/assignment/${assignment.id}?returnTo=${returnTo}`;

            return (
              <Card key={assignment.id} className="border-slate-200">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div>
                    <h3 className="font-bold text-slate-900">{assignment.title}</h3>

                    {assignment.description && (
                      <p className="mt-1 text-sm text-slate-500">
                        {assignment.description}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-slate-400">
                      {assignment.deadline
                        ? `آخر موعد: ${new Date(
                            assignment.deadline
                          ).toLocaleDateString("ar-EG")}`
                        : "بدون موعد محدد"}
                    </p>

                    {submission?.status === "graded" && (
                      <p className="mt-2 text-sm font-bold text-emerald-600">
                        <Award className="ml-1 inline h-4 w-4" />
                        النتيجة: {submission.score} / {assignment.max_score || 100}
                      </p>
                    )}

                    {submission?.status === "submitted" && (
                      <p className="mt-2 text-sm text-amber-600">
                        <Clock className="ml-1 inline h-4 w-4" />
                        بانتظار تصحيح المدرس
                      </p>
                    )}
                  </div>

                  <Link to={target}>
                    <Button className="gap-2">
                      {submission ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {submission ? "فتح الحل" : "حل الواجب"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
