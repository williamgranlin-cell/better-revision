import { useState, useEffect } from "react";

export interface Control {
  id: string;
  name: string;
  subject: string;
  date: string;
  importance: "low" | "medium" | "high";
  targetGrade: string;
}

export const useControls = () => {
  const [controls, setControls] = useState<Control[]>(() => {
    const saved = localStorage.getItem("controls");
    return saved ? JSON.parse(saved) : [
      {
        id: "1",
        name: "Contrôle de Mathématiques",
        subject: "Maths",
        date: "2025-11-15",
        importance: "high" as const,
        targetGrade: "16/20",
      },
      {
        id: "2",
        name: "Examen de Physique",
        subject: "Physique",
        date: "2025-11-20",
        importance: "medium" as const,
        targetGrade: "14/20",
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem("controls", JSON.stringify(controls));
  }, [controls]);

  const addControl = (control: Omit<Control, "id">) => {
    const newControl: Control = {
      ...control,
      id: Date.now().toString(),
    };
    setControls([...controls, newControl]);
  };

  const deleteControl = (id: string) => {
    setControls(controls.filter((c) => c.id !== id));
  };

  return { controls, addControl, deleteControl };
};
