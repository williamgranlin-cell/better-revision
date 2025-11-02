import { useState, useEffect } from "react";

export interface Course {
  id: string;
  name: string;
  color: string;
  intervals: number[];
  firstRevisionDate: string;
}

export interface RevisionEvent {
  courseId: string;
  courseName: string;
  color: string;
  date: string;
  revisionNumber: number;
}

export const useCourses = () => {
  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem("courses");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("courses", JSON.stringify(courses));
  }, [courses]);

  const addCourse = (course: Omit<Course, "id">) => {
    const newCourse: Course = {
      ...course,
      id: Date.now().toString(),
    };
    setCourses([...courses, newCourse]);
  };

  const deleteCourse = (id: string) => {
    setCourses(courses.filter((c) => c.id !== id));
  };

  const getRevisionEvents = (): RevisionEvent[] => {
    const events: RevisionEvent[] = [];
    
    courses.forEach((course) => {
      const firstDate = new Date(course.firstRevisionDate);
      
      course.intervals.forEach((interval, index) => {
        const revisionDate = new Date(firstDate);
        revisionDate.setDate(revisionDate.getDate() + interval);
        
        events.push({
          courseId: course.id,
          courseName: course.name,
          color: course.color,
          date: revisionDate.toISOString().split("T")[0],
          revisionNumber: index + 1,
        });
      });
    });
    
    return events;
  };

  return { courses, addCourse, deleteCourse, getRevisionEvents };
};
