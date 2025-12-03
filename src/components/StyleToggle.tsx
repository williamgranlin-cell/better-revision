import { Palette, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStylePreference } from "@/hooks/useStylePreference";

export function StyleToggle() {
  const { style, toggleStyle } = useStylePreference();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleStyle}
      className="transition-smooth"
    >
      {style === "vibrant" ? (
        <Sparkles className="h-[1.2rem] w-[1.2rem] text-primary" />
      ) : (
        <Palette className="h-[1.2rem] w-[1.2rem]" />
      )}
      <span className="sr-only">Toggle style</span>
    </Button>
  );
}
