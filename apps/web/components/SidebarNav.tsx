import React from "react";

export interface Section {
  id: string;
  title: string;
  icon: React.ElementType;
}

interface SidebarNavProps {
  sections: Section[];
  activeSection: string;
  onSectionChange: (id: string) => void;
}

const SidebarNav: React.FC<SidebarNavProps> = ({
  sections,
  activeSection,
  onSectionChange,
}) => (
  <div className="p-6">
    <h2 className="text-lg font-bold mb-4">API Documentation</h2>
    <nav className="space-y-2">
      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              activeSection === section.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            <Icon className="h-4 w-4" />
            {section.title}
          </button>
        );
      })}
    </nav>
  </div>
);

export default SidebarNav;
