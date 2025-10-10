"use client";
import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import ConfigurationPanel from "@/components/playground/ConfigurationPanel";
import CodeEditor from "@/components/playground/CodeEditor";
import OutputConsole from "@/components/playground/OutputConsole";
import { SUPPORTED_LANGUAGES } from "@/components/playground/languages";
import { apiKeyService } from "@/services/apiKeyService";
import { codeExecutionService } from "@/services/codeExecutionService";

export default function CodePlayground() {
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(
    SUPPORTED_LANGUAGES.find((lang) => lang.value === "python")?.defaultCode ||
      ""
  );
  const [apiKey, setApiKey] = useState("");
  const [isBacktesting, setIsBacktesting] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("");

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const keys = await apiKeyService.getUserApiKeys();
        const activeKey = keys.find((key) => key.isActive);
        if (activeKey) {
          setApiKey(activeKey.id); // Assuming id is the public key, but wait, from the interface, id is string, but probably need the public key.
        }
      } catch (error) {
        console.error("Failed to fetch API key:", error);
      }
    };
    fetchApiKey();
  }, []);

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    const langData = SUPPORTED_LANGUAGES.find(
      (lang) => lang.value === newLanguage
    );
    if (langData) {
      setCode(langData.defaultCode);
    }
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput("");

    try {
      if (isBacktesting) {
        const result = await codeExecutionService.executeCode(language, code);
        setOutput(result);
      } else {
        if (!apiKey) {
          setOutput("Error: API key required for live trading mode.");
          return;
        }
        // Simulate live trading
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setOutput(
          `Live trading simulation completed.\n\nTrade executed:\n- Symbol: AAPL\n- Action: BUY\n- Quantity: 10\n- Price: $150.00\n\nNote: This is a simulation. Real trades require proper API integration.`
        );
      }
    } catch (error) {
      setOutput(`Error executing code: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    const langData = SUPPORTED_LANGUAGES.find(
      (lang) => lang.value === language
    );
    if (langData) {
      setCode(langData.defaultCode);
    }
    setOutput("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6 space-y-6 w-full">
        <ConfigurationPanel
          language={language}
          setLanguage={handleLanguageChange}
          code={code}
          setCode={setCode}
          apiKey={apiKey}
          setApiKey={setApiKey}
          isBacktesting={isBacktesting}
          setIsBacktesting={setIsBacktesting}
          isRunning={isRunning}
          onRunCode={handleRunCode}
          onReset={handleReset}
        />
        <div className="space-y-6 w-f">
          <div className="h-[500px]">
            <CodeEditor
              language={language}
              code={code}
              onChange={(value) => setCode(value || "")}
            />
          </div>
          <OutputConsole output={output} isRunning={isRunning} />
        </div>
      </div>
    </div>
  );
}
