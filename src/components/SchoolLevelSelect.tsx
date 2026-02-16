import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SCHOOL_LEVELS } from "@/lib/subjects";

interface SchoolLevelSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SchoolLevelSelect = ({
  value,
  onValueChange,
  placeholder = "Sélectionner un niveau",
  className,
}: SchoolLevelSelectProps) => {
  const handleChange = (v: string) => {
    onValueChange(v === "none" ? "" : v);
  };

  return (
    <Select value={value || "none"} onValueChange={handleChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        <SelectItem value="none">Aucun niveau</SelectItem>
        {SCHOOL_LEVELS.map((level) => (
          <SelectItem key={level.value} value={level.value}>
            {level.emoji} {level.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
