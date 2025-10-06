"use client";
import { useState, useRef, useEffect } from "react";
import { Key, TrendingUp, BarChart3, Zap } from "lucide-react";
import SidebarNav from "@/components/SidebarNav";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import SectionContent from "@/components/SectionContent";

const sections = [
  { id: "getting-started", title: "Getting Started", icon: Key },
  { id: "authentication", title: "Authentication", icon: Key },
  { id: "algo-trading", title: "Algorithmic Trading", icon: TrendingUp },
  { id: "backtesting", title: "Backtesting", icon: BarChart3 },
  { id: "no-code-builder", title: "No-Code Strategy Builder", icon: Zap },
];

export default function ApiDocsPage() {
  const [activeSection, setActiveSection] = useState("getting-started");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const scrollToTop = () => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        setShowScrollTop(contentRef.current.scrollTop > 400);
      }
    };
    const currentRef = contentRef.current;
    if (currentRef) {
      currentRef.addEventListener("scroll", handleScroll);
      return () => currentRef.removeEventListener("scroll", handleScroll);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      <main className="flex w-full">
        <SidebarNav
          sections={sections}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />
        <div
          ref={contentRef}
          className="flex-1 p-6 w-full overflow-y-auto h-screen"
        >
          <SectionContent
            activeSection={activeSection}
            handleSectionChange={handleSectionChange}
          />
          <ScrollToTopButton show={showScrollTop} onClick={scrollToTop} />
        </div>
      </main>
    </div>
  );
}
