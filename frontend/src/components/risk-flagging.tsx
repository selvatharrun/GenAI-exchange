"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  ArrowLeft,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Info,
  Book,
  Clock,
  Loader2,
  Eye
} from "lucide-react";
import { Note } from "@/components/type";

interface RiskFlag {
  id: string;
  noteId: string;
  riskLevel: "high" | "medium" | "low";
  riskType: string;
  description: string;
  clause: string;
  recommendation: string;
  confidence: number;
}

interface RiskFlaggingProps {
  notes: Note[];
  onBack: () => void;
  onViewNote: (noteId: string) => void;
}

export default function RiskFlagging({ notes, onBack, onViewNote }: RiskFlaggingProps) {
  const [riskFlags, setRiskFlags] = useState<RiskFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<"all" | "high" | "medium" | "low">("all");

  useEffect(() => {
    const analyzeRisks = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Simulate AI risk analysis - replace with actual risk analysis
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Mock risk analysis results
        const mockRiskFlags: RiskFlag[] = [
          {
            id: "risk-1",
            noteId: notes[0]?.id || "note-1",
            riskLevel: "high",
            riskType: "Unlimited Liability",
            description: "This clause contains unlimited liability exposure without caps or limitations.",
            clause: "liable for all damages, costs, and expenses",
            recommendation: "Add liability caps and exclude consequential damages.",
            confidence: 0.92
          },
          {
            id: "risk-2",
            noteId: notes[1]?.id || "note-2",
            riskLevel: "medium",
            riskType: "Ambiguous Termination",
            description: "Termination clause lacks clear notice requirements and procedures.",
            clause: "may be terminated at any time for any reason",
            recommendation: "Specify minimum notice period and termination procedures.",
            confidence: 0.78
          },
          {
            id: "risk-3",
            noteId: notes[2]?.id || "note-3",
            riskLevel: "high",
            riskType: "Broad Indemnification",
            description: "Indemnification clause is overly broad and may be unenforceable.",
            clause: "indemnify against any and all claims",
            recommendation: "Limit indemnification to specific breach scenarios.",
            confidence: 0.88
          },
          {
            id: "risk-4",
            noteId: notes[0]?.id || "note-1",
            riskLevel: "low",
            riskType: "Minor Compliance",
            description: "Potential compliance issue with data protection regulations.",
            clause: "collection and use of personal information",
            recommendation: "Review against current privacy laws.",
            confidence: 0.65
          }
        ];

        setRiskFlags(mockRiskFlags);
      } catch (err) {
        setError("Failed to analyze risk factors. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    if (notes.length > 0) {
      analyzeRisks();
    } else {
      setIsLoading(false);
    }
  }, [notes]);

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case "high": return <ShieldAlert className="h-4 w-4 text-red-600" />;
      case "medium": return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "low": return <ShieldCheck className="h-4 w-4 text-green-600" />;
      default: return <Shield className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "high": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      case "medium": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "low": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const filteredRiskFlags = selectedRiskLevel === "all"
    ? riskFlags
    : riskFlags.filter(flag => flag.riskLevel === selectedRiskLevel);

  const getRiskCounts = () => {
    const counts = { high: 0, medium: 0, low: 0, total: riskFlags.length };
    riskFlags.forEach(flag => {
      counts[flag.riskLevel]++;
    });
    return counts;
  };

  const riskCounts = getRiskCounts();

  const findNoteById = (noteId: string) => {
    return notes.find(note => note.id === noteId);
  };

  return (
    <div className="h-full border-0 glass rounded-xl overflow-hidden glow-red">
      {/* Header */}
      <div className="border-b glass">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Risk Analysis
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {riskCounts.total} risks identified
            </Badge>
          </div>
        </div>

        {/* Risk Summary */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {riskCounts.total}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Risks</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-red-700 dark:text-red-300">
                {riskCounts.high}
              </div>
              <div className="text-xs text-red-600 dark:text-red-400">High Risk</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
                {riskCounts.medium}
              </div>
              <div className="text-xs text-yellow-600 dark:text-yellow-400">Medium Risk</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-green-700 dark:text-green-300">
                {riskCounts.low}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">Low Risk</div>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter by risk level:
            </span>
            <select
              value={selectedRiskLevel}
              onChange={(e) => setSelectedRiskLevel(e.target.value as any)}
              className="text-sm border border-input rounded-md bg-background px-2 py-1"
            >
              <option value="all">All Risks</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-0 h-[calc(100vh-24rem)]">
        <ScrollArea className="h-full">
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <Loader2 className="h-5 w-5 animate-spin text-red-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Analyzing clauses for risk factors...
                  </span>
                </div>
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="glass">
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2 mb-3" />
                      <Skeleton className="h-3 w-full mb-2" />
                      <Skeleton className="h-3 w-4/5" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Analysis Failed
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {error}
                </p>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </Button>
              </div>
            ) : filteredRiskFlags.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShieldCheck className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {selectedRiskLevel === "all" ? "No Risks Detected" : `No ${selectedRiskLevel} risk flags`}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {selectedRiskLevel === "all"
                    ? "All analyzed clauses appear to be low risk."
                    : `No ${selectedRiskLevel} risk issues found in the analyzed clauses.`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRiskFlags.map((flag) => {
                  const relatedNote = findNoteById(flag.noteId);
                  return (
                    <Card
                      key={flag.id}
                      className={`glass hover:shadow-md transition-shadow border-l-4 ${
                        flag.riskLevel === "high" ? "border-l-red-500" :
                        flag.riskLevel === "medium" ? "border-l-yellow-500" :
                        "border-l-green-500"
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            {getRiskIcon(flag.riskLevel)}
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                              {flag.riskType}
                            </h3>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${getRiskBadgeColor(flag.riskLevel)}`}
                            >
                              {flag.riskLevel} risk
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(flag.confidence * 100)}% confidence
                            </Badge>
                          </div>

                          {relatedNote && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewNote(flag.noteId)}
                              className="h-7 px-2 text-xs"
                              title="View original note"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Note
                            </Button>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {flag.description}
                        </p>

                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-3">
                          <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Problematic Clause:
                          </h4>
                          <p className="text-sm text-gray-800 dark:text-gray-200 font-mono">
                            "{flag.clause}"
                          </p>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                Recommendation:
                              </h4>
                              <p className="text-sm text-blue-600 dark:text-blue-400">
                                {flag.recommendation}
                              </p>
                            </div>
                          </div>
                        </div>

                        {relatedNote && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <Book className="h-3 w-3" />
                              <span>Page {relatedNote.page}</span>
                              <Clock className="h-3 w-3 ml-2" />
                              <span>{new Date(relatedNote.timestamp).toLocaleDateString()}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}