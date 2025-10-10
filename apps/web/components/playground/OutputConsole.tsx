"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal } from "lucide-react";

interface OutputConsoleProps {
  output: string;
  isRunning: boolean;
}

export default function OutputConsole({
  output,
  isRunning,
}: OutputConsoleProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Terminal className="h-4 w-4" />
          Output Console
          {isRunning && (
            <span className="text-xs text-muted-foreground">(Running...)</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] w-full">
          <pre className="p-4 text-sm font-mono whitespace-pre-wrap bg-muted rounded-b-lg">
            {output || "Output will appear here..."}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
