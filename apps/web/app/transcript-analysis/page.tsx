"use client";

import { useState, useRef } from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Send, CheckCircle, HelpCircle, FileText, FileJson, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isProcessing?: boolean;
}

// Mock backend responses based on the backend code structure
const mockResponses = {
  confirmation: {
    type: 'confirmation',
    message: `✅ **Investment Parameters Extracted Successfully!**

I've successfully processed your transcript and extracted the following investment parameters:

**Investment Details:**
- **Investable Amount:** ₹10,00,000
- **Investment Horizon:** Long term (5+ years)
- **Target Return:** 12% annually
- **Risk Tolerance:** Medium
- **Liquidity Needs:** Long term

**Additional Constraints:**
- Sector Limits: IT (25%), Banking (30%)
- Max Small Cap: 20%
- No Leverage: Yes
- ESG Exclusions: Tobacco, Gambling

**Preferences:**
- Diversification Priority: Sector
- Rebalancing Frequency: Quarterly
- Automation Mode: Auto

Your investment parameters have been saved and are ready for portfolio optimization. You can download the complete JSON file below.`
  },
  clarification: {
    type: 'questions',
    message: `I've analyzed your transcript, but I need clarification on a few mandatory fields:

**Missing Information:**

1. **Investable Amount** - How much capital do you want to invest? (e.g., 10 lakh rupees, 50 lakhs, etc.)

2. **Investment Horizon** - What is your investment timeframe? 
   - Short term (less than 1 year)
   - Medium term (2-3 years)
   - Long term (5+ years)

3. **Target Return** - What annual return percentage are you targeting? (e.g., 10%, 12%, 15%)

4. **Risk Tolerance** - What is your risk appetite?
   - Low (conservative)
   - Medium (balanced)
   - High (aggressive)

5. **Liquidity Needs** - When might you need access to this capital?
   - Immediate
   - 3-12 months
   - Long term

Please provide these details so I can complete your investment parameter setup.`
  }
};

export default function TranscriptAnalysis() {
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTranscriptInput, setShowTranscriptInput] = useState(true);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  const simulateBackendResponse = (fileType: 'transcript' | 'json') => {
    // For demo: randomly choose between confirmation and clarification
    // In real app, this would be based on actual backend response
    const responseType = fileType === 'json' ? 'confirmation' : (Math.random() > 0.5 ? 'confirmation' : 'clarification');
    const response = mockResponses[responseType];
    
    setIsProcessing(true);
    
    setTimeout(() => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: response.message,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsProcessing(false);
      
      if (responseType === 'confirmation') {
        toast.success('Investment parameters extracted successfully!');
      } else {
        toast.info('Additional information needed');
      }
    }, 2000);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'txt') {
      // Handle transcript file
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setTranscript(content);
        setUploadedFileName(file.name);
        toast.success('Transcript file loaded successfully');
      };
      reader.onerror = () => {
        toast.error('Error reading file');
      };
      reader.readAsText(file);
    } else if (fileExtension === 'json') {
      // Handle JSON file (processed result)
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonContent = e.target?.result as string;
          const parsed = JSON.parse(jsonContent);
          
          // Display the JSON content in a readable format
          const formattedContent = JSON.stringify(parsed, null, 2);
          setTranscript(formattedContent);
          setUploadedFileName(file.name);
          
          // Add user message showing JSON was uploaded
          const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: `Uploaded processed JSON file: ${file.name}`,
            timestamp: new Date()
          };
          setMessages([userMessage]);
          setShowTranscriptInput(false);
          
          // Simulate backend response for JSON (usually confirmation)
          simulateBackendResponse('json');
          
          toast.success('JSON file loaded successfully');
        } catch (error) {
          toast.error('Invalid JSON file');
        }
      };
      reader.onerror = () => {
        toast.error('Error reading file');
      };
      reader.readAsText(file);
    } else {
      toast.error('Please upload a .txt or .json file');
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
  };

  const handleSubmitTranscript = () => {
    if (!transcript.trim()) {
      toast.error('Please paste a transcript or upload a file first');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: uploadedFileName 
        ? `Uploaded file: ${uploadedFileName}\n\n${transcript.substring(0, 200)}...`
        : transcript.substring(0, 500) + (transcript.length > 500 ? '...' : ''),
      timestamp: new Date()
    };

    setMessages([userMessage]);
    setIsProcessing(true);
    setShowTranscriptInput(false);
    setTranscript('');
    setUploadedFileName(null);
    simulateBackendResponse('transcript');
  };

  const handleSendMessage = () => {
    if (!transcript.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: transcript,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setTranscript('');
    setIsProcessing(true);
    simulateBackendResponse('transcript');
  };

  const handleReset = () => {
    setMessages([]);
    setTranscript('');
    setShowTranscriptInput(true);
    setIsProcessing(false);
    setUploadedFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
  };

  const handleDownloadJSON = () => {
    // Mock JSON structure based on backend response
    const mockJSON = {
      timestamp: new Date().toISOString(),
      extracted_parameters: {
        investable_amount: 1000000,
        investment_horizon: "long",
        target_return: 12.0,
        risk_tolerance: {
          category: "medium",
          risk_aversion_lambda: 0.5
        },
        liquidity_needs: "long",
        constraints: {
          sector_limits: { IT: 0.25, Banking: 0.30 },
          min_allocation: 0.05,
          max_allocation: 0.30,
          ESG_exclusions: ["tobacco", "gambling"],
          no_leverage: true,
          max_smallcap: 0.20
        },
        preferences: {
          diversification_priority: "sector",
          rebalancing_frequency: "quarterly",
          automation_mode: "auto"
        },
        generic_notes: []
      },
      missing_fields: [],
      completion_status: "complete",
      warnings: []
    };

    const blob = new Blob([JSON.stringify(mockJSON, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'investment_parameters.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('JSON file downloaded');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="lg:pl-64">
        <div className="container mx-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transcript Analysis</h1>
            <p className="text-muted-foreground mt-2">
              Upload your trading consultant conversation for AI-powered analysis and investment parameter extraction
            </p>
          </div>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Investment Parameters Extractor</CardTitle>
              <CardDescription>
                Upload a transcript file or paste your conversation to extract structured investment parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {showTranscriptInput && messages.length === 0 ? (
                <div className="space-y-6">
                  {/* File Upload Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Transcript File Upload */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Upload Transcript File
                      </label>
                      <div className="relative">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".txt"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="transcript-upload"
                        />
                        <label
                          htmlFor="transcript-upload"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                        >
                          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">TXT files only</p>
                        </label>
                      </div>
                      {uploadedFileName && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span className="truncate">{uploadedFileName}</span>
                          <button
                            onClick={() => {
                              setUploadedFileName(null);
                              setTranscript('');
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="ml-auto hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* JSON File Upload */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <FileJson className="h-4 w-4" />
                        Upload Processed JSON
                      </label>
                      <div className="relative">
                        <input
                          ref={jsonFileInputRef}
                          type="file"
                          accept=".json"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="json-upload"
                        />
                        <label
                          htmlFor="json-upload"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                        >
                          <FileJson className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">JSON files only</p>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  {/* Text Input */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Paste Transcript</label>
                    <Textarea
                      placeholder="Paste your trading consultant chat transcript here...&#10;&#10;Example:&#10;User: I have 10 lakh rupees to invest for long term&#10;Consultant: What return are you targeting?&#10;User: Around 12% annually would be good&#10;Consultant: What's your risk tolerance?&#10;User: I'm comfortable with moderate risk..."
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      className="min-h-[300px] font-mono text-sm resize-none"
                    />
                  </div>

                  <Button 
                    onClick={handleSubmitTranscript} 
                    className="w-full" 
                    size="lg"
                    disabled={!transcript.trim()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Analyze Transcript
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Chat Messages */}
                  <ScrollArea className="h-[500px] rounded-lg border border-border bg-muted/30 p-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex",
                            message.type === 'user' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[85%] rounded-lg p-4 shadow-sm",
                              message.type === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-card border border-border'
                            )}
                          >
                            <div className="flex items-start gap-3">
                              {message.type === 'assistant' && (
                                <div className="mt-0.5 flex-shrink-0">
                                  {message.content.includes('✅') ? (
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <HelpCircle className="h-5 w-5 text-amber-500" />
                                  )}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div 
                                  className={cn(
                                    "text-sm whitespace-pre-wrap break-words",
                                    message.type === 'user' ? 'text-primary-foreground' : 'text-foreground'
                                  )}
                                >
                                  {message.content.split(/\*\*(.*?)\*\*/).map((part, idx) => 
                                    idx % 2 === 1 ? (
                                      <strong key={idx}>{part}</strong>
                                    ) : (
                                      <span key={idx}>{part}</span>
                                    )
                                  )}
                                </div>
                                <p className={cn(
                                  "mt-2 text-xs",
                                  message.type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                )}>
                                  {message.timestamp.toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {isProcessing && (
                        <div className="flex justify-start">
                          <div className="max-w-[85%] rounded-lg bg-card border border-border p-4 shadow-sm">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              <span className="text-sm text-muted-foreground">Processing transcript...</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Input Area */}
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your response or provide additional information..."
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="min-h-[100px] resize-none"
                      disabled={isProcessing}
                    />
                    <div className="flex flex-col gap-2">
                      <Button 
                        onClick={handleSendMessage} 
                        disabled={isProcessing || !transcript.trim()}
                        size="icon"
                        className="h-10 w-10"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button 
                        onClick={handleReset} 
                        variant="outline" 
                        size="icon"
                        className="h-10 w-10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Download JSON Button (shown when confirmation is received) */}
                  {messages.some(m => m.type === 'assistant' && m.content.includes('✅')) && (
                    <Button 
                      onClick={handleDownloadJSON} 
                      variant="outline" 
                      className="w-full"
                    >
                      <FileJson className="mr-2 h-4 w-4" />
                      Download Investment Parameters JSON
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-muted/30 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">How it works</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="font-medium text-foreground">1.</span>
                  <span>Upload a transcript file (.txt) or paste your conversation with a trading consultant</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-foreground">2.</span>
                  <span>AI analyzes the transcript and extracts investment parameters (amount, horizon, risk, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-foreground">3.</span>
                  <span>If all mandatory fields are found, you'll receive a confirmation with extracted parameters</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-foreground">4.</span>
                  <span>If information is missing, the AI will ask specific clarification questions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-foreground">5.</span>
                  <span>Provide additional details via chat to complete your investment parameter setup</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-foreground">6.</span>
                  <span>Download the final JSON file containing structured investment parameters</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

