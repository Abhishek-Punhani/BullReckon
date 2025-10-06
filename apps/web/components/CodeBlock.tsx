import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ChevronUp } from "lucide-react";

interface CodeBlockProps {
  codes: { [language: string]: string };
  defaultLanguage?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  codes = {},
  defaultLanguage,
}) => {
  const languages = Object.keys(codes || {});
  const [selectedLang, setSelectedLang] = useState(
    defaultLanguage || languages[0]
  );
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  if (!codes || languages.length === 0) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(codes[selectedLang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScrollDown = () => {
    if (codeRef.current) {
      codeRef.current.scrollTo({
        top: codeRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative">
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
        <select
          className="bg-slate-700 text-slate-100 rounded px-2 py-1 text-xs max-w-[120px] overflow-x-auto"
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value)}
          style={{ maxHeight: 32, overflowY: "auto" }}
        >
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>
      <div className="absolute top-2 right-2 flex gap-2 z-10">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 hover:bg-slate-700"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Copy className="h-4 w-4 text-slate-300" />
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 hover:bg-slate-700"
          aria-label="Scroll code down"
          onClick={handleScrollDown}
        >
          <ChevronUp className="h-4 w-4 rotate-180 text-slate-300" />
        </Button>
      </div>
      <div className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto pt-12">
        <pre ref={codeRef} className="text-xs max-h-96 overflow-auto">
          {codes[selectedLang]}
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;
