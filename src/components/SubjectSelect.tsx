import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { SUBJECT_GROUPS } from "@/lib/subjects";

interface SubjectSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  allLabel?: string;
  className?: string;
}

export const SubjectSelect = ({
  value,
  onValueChange,
  placeholder = "Sélectionner une matière",
  allLabel = "Toutes matières",
  className,
}: SubjectSelectProps) => {
  const handleChange = (v: string) => {
    onValueChange(v === "all" || v === "none" ? "" : v);
  };

  return (
    <Select value={value || "none"} onValueChange={handleChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        <SelectItem value="none">{allLabel}</SelectItem>
        {SUBJECT_GROUPS.map((group) => (
          <SelectGroup key={group.label}>
            <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
              {group.label}
            </SelectLabel>
            {group.subjects.map((subject) => (
              <SelectItem key={subject.value} value={subject.value}>
                {subject.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
};
