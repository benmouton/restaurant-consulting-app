import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChefHat, 
  LogOut,
  ArrowLeft,
  Users,
  BookOpen,
  ClipboardList,
  FileText,
  CheckSquare,
  GraduationCap
} from "lucide-react";
import type { TrainingTemplate } from "@shared/schema";

const contentTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  overview: BookOpen,
  procedure: FileText,
  checklist: ClipboardList,
  assessment: CheckSquare,
};

const contentTypeColors: Record<string, string> = {
  overview: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  procedure: "bg-green-500/10 text-green-600 dark:text-green-400",
  checklist: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  assessment: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

export default function TemplatesPage() {
  const { user, logout } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<TrainingTemplate | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("server");

  const { data: templates, isLoading } = useQuery<TrainingTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const serverTemplates = templates?.filter(t => t.category === "server") || [];
  const kitchenTemplates = templates?.filter(t => t.category === "kitchen") || [];

  const currentTemplates = activeCategory === "server" ? serverTemplates : kitchenTemplates;

  const groupedBySection = currentTemplates.reduce<Record<string, TrainingTemplate[]>>((acc, template) => {
    if (!acc[template.section]) {
      acc[template.section] = [];
    }
    acc[template.section].push(template);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-primary" />
              <span className="font-bold">Training Templates</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>
                  {user?.firstName?.[0] || user?.email?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm hidden md:inline">
                {user?.firstName || user?.email || "User"}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => logout()}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Real Training Templates</h1>
          <p className="text-muted-foreground">
            These examples from Mouton's Bistro demonstrate how the consulting philosophy translates into actual training materials.
            Use these as models for building your own systems.
          </p>
        </div>

        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="server" className="flex items-center gap-2" data-testid="tab-server">
              <Users className="h-4 w-4" />
              Server Training
            </TabsTrigger>
            <TabsTrigger value="kitchen" className="flex items-center gap-2" data-testid="tab-kitchen">
              <ChefHat className="h-4 w-4" />
              Kitchen Training
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  {activeCategory === "server" ? "Server Manual" : "Kitchen Manual"}
                </CardTitle>
                <CardDescription>
                  7-day training program with structured daily objectives
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[60vh]">
                  {isLoading ? (
                    <div className="p-4 space-y-4">
                      {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="p-2">
                      {Object.entries(groupedBySection).map(([section, sectionTemplates]) => (
                        <div key={section} className="mb-4">
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {section}
                          </div>
                          {sectionTemplates.map((template) => {
                            const Icon = contentTypeIcons[template.contentType] || FileText;
                            const isSelected = selectedTemplate?.id === template.id;
                            return (
                              <button
                                key={template.id}
                                onClick={() => setSelectedTemplate(template)}
                                className={`w-full text-left p-3 rounded-md transition-colors ${
                                  isSelected 
                                    ? "bg-primary/10 border border-primary/20" 
                                    : "hover-elevate"
                                }`}
                                data-testid={`template-item-${template.id}`}
                              >
                                <div className="flex items-start gap-2">
                                  <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">
                                      {template.title}
                                    </div>
                                    <Badge 
                                      variant="secondary" 
                                      className={`mt-1 text-xs ${contentTypeColors[template.contentType] || ""}`}
                                    >
                                      {template.contentType}
                                    </Badge>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {selectedTemplate ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl">{selectedTemplate.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {selectedTemplate.section}
                      </CardDescription>
                    </div>
                    <Badge 
                      variant="secondary"
                      className={contentTypeColors[selectedTemplate.contentType] || ""}
                    >
                      {selectedTemplate.contentType}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedTemplate.keyPoints && selectedTemplate.keyPoints.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-sm mb-2 text-muted-foreground uppercase tracking-wide">
                        Key Points
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplate.keyPoints.map((point, i) => (
                          <Badge key={i} variant="outline">
                            {point}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap font-mono text-sm bg-muted/50 p-4 rounded-lg border">
                      {selectedTemplate.content}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center min-h-[400px]">
                <CardContent className="text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Select a Template</h3>
                  <p className="text-muted-foreground text-sm max-w-xs">
                    Choose a training template from the list to view its contents and see how structured training programs are built.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
