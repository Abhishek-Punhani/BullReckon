import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";

interface ScrollToTopButtonProps {
  show: boolean;
  onClick: () => void;
}

const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({
  show,
  onClick,
}) => {
  if (!show) return null;
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-8 right-8 h-12 w-12 rounded-full shadow-lg"
      size="icon"
    >
      <ChevronUp className="h-5 w-5" />
    </Button>
  );
};

export default ScrollToTopButton;
