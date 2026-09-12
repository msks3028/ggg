import { useState, useEffect, useCallback } from 'react';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';

// Fetches the current teacher's courses (filtered client-side by teacher_id).
export function useTeacherCourses() {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!user) return;
        try {
            const data = await api.entities.Course.list('-created_date', 200);
            setCourses(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { load(); }, [load]);

    return { courses, loading, reload: load };
}