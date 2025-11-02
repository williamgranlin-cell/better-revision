import { useState, useEffect } from "react";

export interface Objective {
  id: string;
  text: string;
  completed: boolean;
}

export const useObjectives = () => {
  const [objectives, setObjectives] = useState<Objective[]>(() => {
    const saved = localStorage.getItem("objectives");
    return saved ? JSON.parse(saved) : [
      { id: "1", text: "Réviser le chapitre 3 de Maths", completed: false },
      { id: "2", text: "Faire les exercices de Physique", completed: false },
      { id: "3", text: "Relire le cours d'Histoire", completed: false },
    ];
  });

  useEffect(() => {
    localStorage.setItem("objectives", JSON.stringify(objectives));
  }, [objectives]);

  const addObjective = (text: string) => {
    const newObjective: Objective = {
      id: Date.now().toString(),
      text,
      completed: false,
    };
    setObjectives([...objectives, newObjective]);
  };

  const toggleObjective = (id: string) => {
    setObjectives(
      objectives.map((obj) =>
        obj.id === id ? { ...obj, completed: !obj.completed } : obj
      )
    );
  };

  const deleteObjective = (id: string) => {
    setObjectives(objectives.filter((obj) => obj.id !== id));
  };

  return { objectives, addObjective, toggleObjective, deleteObjective };
};
