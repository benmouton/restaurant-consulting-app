import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Sparkles,
  Calendar,
  Image,
  Settings,
  FileText,
  Clock,
  Copy,
  Check,
  ChevronRight,
  Instagram,
  Facebook,
  Loader2,
  PartyPopper,
  Wand2,
  Link2,
  Unlink,
  Send,
  MapPin,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  History,
} from "lucide-react";
import type { RestaurantHoliday, BrandVoiceSettings, ConnectedAccount, ScheduledPost } from "@shared/schema";

interface SafeConnectedAccount {
  id: number;
  provider: string;
  displayName: string;
  profilePictureUrl?: string;
  status: string;
  createdAt: string;
}

const POST_TYPES = [
  { value: "event_promo", label: "Event Promo" },
  { value: "special", label: "Special / Limited Time" },
  { value: "menu_feature", label: "Menu Feature" },
  { value: "live_music", label: "Live Music / Entertainment" },
  { value: "happy_hour", label: "Happy Hour / Bar Feature" },
  { value: "catering", label: "Catering / Large Party" },
  { value: "hiring", label: "Hiring" },
  { value: "community", label: "Community / Charity" },
  { value: "tonight_vibe", label: "Tonight's Vibe (Quick Post)" },
  { value: "holiday", label: "Holiday / National Day" },
];

const OUTPUT_STYLES = [
  { value: "short_punchy", label: "Short & Punchy" },
  { value: "warm_hospitality", label: "Warm & Hospitality-forward" },
  { value: "premium", label: "Premium / Elevated" },
  { value: "straight_info", label: "Straight Info / No Fluff" },
];

const TARGET_AUDIENCES = [
  { value: "date_night", label: "Date Night" },
  { value: "families", label: "Families" },
  { value: "lunch_crowd", label: "Lunch Crowd" },
  { value: "bar_crowd", label: "Bar Crowd" },
  { value: "music_lovers", label: "Music Lovers" },
  { value: "brunch", label: "Brunch" },
];

const TONES = [
  { value: "fun", label: "Fun" },
  { value: "classy", label: "Classy" },
  { value: "high_energy", label: "High Energy" },
  { value: "low_key", label: "Low Key" },
  { value: "community", label: "Community" },
];

const CTAS = [
  { value: "reserve_now", label: "Reserve Now" },
  { value: "walk_ins", label: "Walk-ins Welcome" },
  { value: "order_online", label: "Order Online" },
  { value: "call_to_book", label: "Call to Book" },
  { value: "rsvp", label: "RSVP / Ticket Link" },
  { value: "come_early", label: "Come Early / Limited Seating" },
];

interface GeneratedPost {
  primaryCaption: string;
  shortCaption: string;
  storyOverlays: string[];
  hashtags: string[];
  suggestedPostTime: string;
  replyPack: string[];
}

export default function SocialPostBuilder() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("create");
  const [step, setStep] = useState(1);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    postType: "",
    platforms: [] as string[],
    outputStyle: "warm_hospitality",
    eventName: "",
    eventDate: "",
    startTime: "",
    endTime: "",
    promotionDetails: "",
    targetAudience: "",
    tone: "classy",
    cta: "reserve_now",
    selectedHoliday: "",
  });

  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);

  const { data: holidays, isLoading: holidaysLoading } = useQuery<RestaurantHoliday[]>({
    queryKey: ["/api/social-media/holidays/upcoming"],
  });

  const { data: brandSettings } = useQuery<BrandVoiceSettings>({
    queryKey: ["/api/social-media/brand-settings"],
  });

  const { data: connectedAccounts, isLoading: accountsLoading } = useQuery<SafeConnectedAccount[]>({
    queryKey: ["/api/social-media/accounts"],
  });

  const { data: postHistory } = useQuery<ScheduledPost[]>({
    queryKey: ["/api/social-media/posts"],
  });

  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("error");
    if (connected) {
      queryClient.invalidateQueries({ queryKey: ["/api/social-media/accounts"] });
      toast({ title: "Account Connected", description: `Your ${connected} account has been connected successfully.` });
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (error) {
      const diag = params.get("diag");
      let diagInfo = "";
      if (diag) {
        try {
          const d = JSON.parse(diag);
          diagInfo = ` | Scopes: ${(d.scopes || []).join(", ") || "none"} | Token type: ${d.type || "unknown"} | Valid: ${d.is_valid} | API status: ${d.accounts_status} | Pages count: ${d.accounts_count ?? "N/A"}`;
          if (d.source) diagInfo += ` | Source: ${d.source}`;
          if (d.businesses_count !== undefined) diagInfo += ` | Businesses found: ${d.businesses_count}`;
          if (d.businesses_status) diagInfo += ` | Biz API status: ${d.businesses_status}`;
          if (d.accounts_error) diagInfo += ` | Error: ${d.accounts_error}`;
          if (d.business_error) diagInfo += ` | Biz Error: ${d.business_error}`;
        } catch {}
      }
      const errorMessages: Record<string, string> = {
        no_pages: `No Facebook Pages found.${diagInfo}`,
        invalid_state: "Connection session expired. Please try again.",
        oauth_failed: "Connection failed. Please try again.",
        missing_params: "Connection was incomplete. Please try again.",
      };
      toast({
        title: "Connection Failed",
        description: errorMessages[error] || `Connection error: ${error}`,
        variant: "destructive",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const generateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/social-media/generate-post", data);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedPost(data);
      setStep(4);
      toast({ title: "Post generated!", description: "Your content is ready to copy." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate post. Please try again.", variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (accountId: number) => {
      await apiRequest("DELETE", `/api/social-media/accounts/${accountId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-media/accounts"] });
      toast({ title: "Disconnected", description: "Account has been disconnected." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to disconnect account.", variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (data: { caption: string; platformTargets: number[]; postNow: boolean; generatedContent?: object }) => {
      const response = await apiRequest("POST", "/api/social-media/posts", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-media/posts"] });
      toast({ title: "Published!", description: "Your post has been sent to the selected platforms." });
      setStep(1);
      setGeneratedPost(null);
      setSelectedAccountIds([]);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to publish post. Please try again.", variant: "destructive" });
    },
  });

  const handleConnectMeta = async () => {
    try {
      const response = await fetch("/api/oauth/meta/start");
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to start connection.", variant: "destructive" });
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const response = await fetch("/api/oauth/google/start");
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to start connection.", variant: "destructive" });
    }
  };

  const handlePublish = () => {
    if (selectedAccountIds.length === 0) {
      toast({ title: "Select accounts", description: "Please select at least one account to publish to.", variant: "destructive" });
      return;
    }
    if (!generatedPost) return;

    publishMutation.mutate({
      caption: generatedPost.primaryCaption,
      platformTargets: selectedAccountIds,
      postNow: true,
      generatedContent: generatedPost,
    });
  };

  const toggleAccountSelection = (accountId: number) => {
    setSelectedAccountIds(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'facebook':
        return <Facebook className="h-4 w-4 text-blue-600" />;
      case 'instagram':
        return <Instagram className="h-4 w-4 text-pink-600" />;
      case 'google_business':
        return <MapPin className="h-4 w-4 text-red-500" />;
      default:
        return <Link2 className="h-4 w-4" />;
    }
  };

  const handlePlatformToggle = (platform: string) => {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: "Copied!", description: "Text copied to clipboard." });
  };

  const handleGenerate = () => {
    if (!formData.postType) {
      toast({ title: "Missing info", description: "Please select a post type.", variant: "destructive" });
      return;
    }
    if (formData.platforms.length === 0) {
      toast({ title: "Missing info", description: "Please select at least one platform.", variant: "destructive" });
      return;
    }
    generateMutation.mutate(formData);
  };

  const getUpcomingHolidays = () => {
    if (!holidays) return [];
    const today = new Date();
    const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    return holidays
      .filter((h) => {
        const [month, day] = h.date.split('-').map(Number);
        const holidayDate = new Date(today.getFullYear(), month - 1, day);
        const diffDays = Math.ceil((holidayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 14;
      })
      .slice(0, 5);
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Social Media Post Builder
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="create" className="text-xs sm:text-sm" data-testid="tab-create-post">
              <Wand2 className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Create</span>
            </TabsTrigger>
            <TabsTrigger value="accounts" className="text-xs sm:text-sm" data-testid="tab-accounts">
              <Link2 className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Accounts</span>
            </TabsTrigger>
            <TabsTrigger value="holidays" className="text-xs sm:text-sm" data-testid="tab-holidays">
              <PartyPopper className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Holidays</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm" data-testid="tab-history">
              <History className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm" data-testid="tab-settings">
              <Settings className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Voice</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Post Type</Label>
                  <Select
                    value={formData.postType}
                    onValueChange={(v) => setFormData({ ...formData, postType: v })}
                  >
                    <SelectTrigger data-testid="select-post-type">
                      <SelectValue placeholder="What are you posting about?" />
                    </SelectTrigger>
                    <SelectContent>
                      {POST_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Platforms</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={formData.platforms.includes("instagram_feed") ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePlatformToggle("instagram_feed")}
                      data-testid="button-platform-instagram"
                    >
                      <Instagram className="h-4 w-4 mr-2" />
                      Instagram Feed
                    </Button>
                    <Button
                      type="button"
                      variant={formData.platforms.includes("instagram_story") ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePlatformToggle("instagram_story")}
                      data-testid="button-platform-ig-story"
                    >
                      <Instagram className="h-4 w-4 mr-2" />
                      IG Story
                    </Button>
                    <Button
                      type="button"
                      variant={formData.platforms.includes("facebook") ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePlatformToggle("facebook")}
                      data-testid="button-platform-facebook"
                    >
                      <Facebook className="h-4 w-4 mr-2" />
                      Facebook
                    </Button>
                    <Button
                      type="button"
                      variant={formData.platforms.includes("google_business") ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePlatformToggle("google_business")}
                      data-testid="button-platform-google"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Google Business
                    </Button>
                  </div>
                  {connectedAccounts && connectedAccounts.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      <span>{connectedAccounts.filter(a => a.status === 'active').length} account(s) connected</span>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setActiveTab("accounts")} data-testid="button-manage-accounts">
                        Manage
                      </Button>
                    </div>
                  )}
                  {(!connectedAccounts || connectedAccounts.length === 0) && (
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-amber-600">
                      <AlertCircle className="h-3 w-3" />
                      <span>No accounts connected.</span>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setActiveTab("accounts")} data-testid="button-connect-accounts">
                        Connect now
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Output Style</Label>
                  <Select
                    value={formData.outputStyle}
                    onValueChange={(v) => setFormData({ ...formData, outputStyle: v })}
                  >
                    <SelectTrigger data-testid="select-output-style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTPUT_STYLES.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => setStep(2)}
                  disabled={!formData.postType || formData.platforms.length === 0}
                  className="w-full"
                  data-testid="button-next-step"
                >
                  Next: Event Details
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Event/Promotion Name</Label>
                    <Input
                      placeholder="e.g., Jazz Night, Burger Special"
                      value={formData.eventName}
                      onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                      data-testid="input-event-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={formData.eventDate}
                      onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                      data-testid="input-event-date"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      data-testid="input-start-time"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      data-testid="input-end-time"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>What are you promoting?</Label>
                  <Textarea
                    placeholder="Describe the special, event, or feature you're promoting..."
                    value={formData.promotionDetails}
                    onChange={(e) => setFormData({ ...formData, promotionDetails: e.target.value })}
                    rows={3}
                    data-testid="textarea-promotion-details"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1" data-testid="button-back-step-2">
                    Back
                  </Button>
                  <Button onClick={() => setStep(3)} className="flex-1" data-testid="button-next-step-2">
                    Next: Tone & Style
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Target Audience</Label>
                    <Select
                      value={formData.targetAudience}
                      onValueChange={(v) => setFormData({ ...formData, targetAudience: v })}
                    >
                      <SelectTrigger data-testid="select-target-audience">
                        <SelectValue placeholder="Who is this for?" />
                      </SelectTrigger>
                      <SelectContent>
                        {TARGET_AUDIENCES.map((aud) => (
                          <SelectItem key={aud.value} value={aud.value}>
                            {aud.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tone</Label>
                    <Select
                      value={formData.tone}
                      onValueChange={(v) => setFormData({ ...formData, tone: v })}
                    >
                      <SelectTrigger data-testid="select-tone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TONES.map((tone) => (
                          <SelectItem key={tone.value} value={tone.value}>
                            {tone.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Call to Action</Label>
                  <Select
                    value={formData.cta}
                    onValueChange={(v) => setFormData({ ...formData, cta: v })}
                  >
                    <SelectTrigger data-testid="select-cta">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CTAS.map((cta) => (
                        <SelectItem key={cta.value} value={cta.value}>
                          {cta.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {getUpcomingHolidays().length > 0 && (
                  <div className="space-y-2 p-3 bg-muted rounded-lg">
                    <Label className="flex flex-wrap items-center gap-2">
                      <PartyPopper className="h-4 w-4" />
                      Upcoming Holidays
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {getUpcomingHolidays().map((holiday) => (
                        <Badge
                          key={holiday.id}
                          variant={formData.selectedHoliday === holiday.name ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              selectedHoliday:
                                formData.selectedHoliday === holiday.name ? "" : holiday.name,
                            })
                          }
                          data-testid={`badge-holiday-${holiday.id}`}
                        >
                          {holiday.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1" data-testid="button-back-step-3">
                    Back
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={generateMutation.isPending}
                    className="flex-1"
                    data-testid="button-generate-post"
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Post
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && generatedPost && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold flex flex-wrap items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Your Generated Content
                  </h3>
                  <Badge variant="outline" className="text-xs" data-testid="badge-platform-count">
                    {formData.platforms.length} platform{formData.platforms.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="w-full grid grid-cols-4">
                    <TabsTrigger value="all" className="text-xs" data-testid="tab-preview-all">All</TabsTrigger>
                    {formData.platforms.includes("instagram_feed") && (
                      <TabsTrigger value="instagram" className="text-xs" data-testid="tab-preview-instagram">
                        <Instagram className="h-3 w-3 mr-1" />
                        IG
                      </TabsTrigger>
                    )}
                    {formData.platforms.includes("facebook") && (
                      <TabsTrigger value="facebook" className="text-xs" data-testid="tab-preview-facebook">
                        <Facebook className="h-3 w-3 mr-1" />
                        FB
                      </TabsTrigger>
                    )}
                    {formData.platforms.includes("google_business") && (
                      <TabsTrigger value="google" className="text-xs" data-testid="tab-preview-google">
                        <MapPin className="h-3 w-3 mr-1" />
                        GBP
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="all" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Label>Primary Caption</Label>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(generatedPost.primaryCaption, "primary")}
                          data-testid="button-copy-primary"
                        >
                          {copiedField === "primary" ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap" data-testid="text-primary-caption">
                        {generatedPost.primaryCaption}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Label>Short Caption</Label>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(generatedPost.shortCaption, "short")}
                          data-testid="button-copy-short"
                        >
                          {copiedField === "short" ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="p-3 bg-muted rounded-lg text-sm" data-testid="text-short-caption">
                        {generatedPost.shortCaption}
                      </div>
                    </div>
                  </TabsContent>

                  {formData.platforms.includes("instagram_feed") && (
                    <TabsContent value="instagram" className="mt-4">
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 p-2 flex flex-wrap items-center gap-2">
                          <Instagram className="h-4 w-4 text-white" />
                          <span className="text-white text-sm font-medium">Instagram Preview</span>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                            [Your image here]
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{generatedPost.primaryCaption}</p>
                          <div className="flex flex-wrap gap-1">
                            {generatedPost.hashtags.map((tag, i) => (
                              <span key={i} className="text-xs text-primary">{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => copyToClipboard(generatedPost.primaryCaption + "\n\n" + generatedPost.hashtags.join(" "), "ig-full")}
                        data-testid="button-copy-instagram"
                      >
                        {copiedField === "ig-full" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                        Copy Instagram Caption
                      </Button>
                    </TabsContent>
                  )}

                  {formData.platforms.includes("facebook") && (
                    <TabsContent value="facebook" className="mt-4">
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-blue-600 p-2 flex flex-wrap items-center gap-2">
                          <Facebook className="h-4 w-4 text-white" />
                          <span className="text-white text-sm font-medium">Facebook Preview</span>
                        </div>
                        <div className="p-4 space-y-3">
                          <p className="text-sm whitespace-pre-wrap" data-testid="text-facebook-preview">{generatedPost.primaryCaption}</p>
                          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                            [Your image here]
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => copyToClipboard(generatedPost.primaryCaption, "fb-full")}
                        data-testid="button-copy-facebook"
                      >
                        {copiedField === "fb-full" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                        Copy Facebook Post
                      </Button>
                    </TabsContent>
                  )}

                  {formData.platforms.includes("google_business") && (
                    <TabsContent value="google" className="mt-4">
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-green-600 p-2 flex flex-wrap items-center gap-2">
                          <MapPin className="h-4 w-4 text-white" />
                          <span className="text-white text-sm font-medium">Google Business Preview</span>
                        </div>
                        <div className="p-4 space-y-3">
                          <p className="text-sm whitespace-pre-wrap" data-testid="text-google-preview">{generatedPost.shortCaption}</p>
                          <div className="text-xs text-muted-foreground">
                            Tip: Google Business posts are best kept short (under 300 characters).
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => copyToClipboard(generatedPost.shortCaption, "gbp-full")}
                        data-testid="button-copy-google"
                      >
                        {copiedField === "gbp-full" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                        Copy Google Business Post
                      </Button>
                    </TabsContent>
                  )}
                </Tabs>

                {generatedPost.storyOverlays.length > 0 && (
                  <div className="space-y-2">
                    <Label>Story Text Overlays</Label>
                    <div className="space-y-2">
                      {generatedPost.storyOverlays.map((overlay, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-2">
                          <div className="flex-1 p-2 bg-muted rounded text-sm" data-testid={`text-overlay-${i}`}>{overlay}</div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => copyToClipboard(overlay, `overlay-${i}`)}
                            data-testid={`button-copy-overlay-${i}`}
                          >
                            {copiedField === `overlay-${i}` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>Hashtags</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(generatedPost.hashtags.join(" "), "hashtags")}
                      data-testid="button-copy-hashtags"
                    >
                      {copiedField === "hashtags" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {generatedPost.hashtags.map((tag, i) => (
                      <Badge key={i} variant="secondary" data-testid={`badge-hashtag-${i}`}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 p-3 bg-primary/5 rounded-lg" data-testid="text-suggested-time">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    Best time to post: <strong>{generatedPost.suggestedPostTime}</strong>
                  </span>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-2 flex flex-wrap items-center gap-2">
                    <Send className="h-4 w-4" />
                    Publish to Connected Accounts
                  </h3>
                  {connectedAccounts && connectedAccounts.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-muted-foreground">
                          Select which accounts to publish this post to:
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const activeAccounts = connectedAccounts.filter(a => a.status === 'active');
                            if (selectedAccountIds.length === activeAccounts.length) {
                              setSelectedAccountIds([]);
                            } else {
                              setSelectedAccountIds(activeAccounts.map(a => a.id));
                            }
                          }}
                          data-testid="button-select-all-accounts"
                        >
                          {selectedAccountIds.length === connectedAccounts.filter(a => a.status === 'active').length
                            ? 'Deselect All'
                            : 'Select All'}
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {connectedAccounts.filter(a => a.status === 'active').map((account) => (
                          <div
                            key={account.id}
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedAccountIds.includes(account.id)
                                ? 'border-primary bg-primary/5'
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => toggleAccountSelection(account.id)}
                            data-testid={`account-select-${account.id}`}
                          >
                            <Checkbox
                              checked={selectedAccountIds.includes(account.id)}
                              onCheckedChange={() => toggleAccountSelection(account.id)}
                              data-testid={`checkbox-account-${account.id}`}
                            />
                            <Avatar className="h-8 w-8">
                              {account.profilePictureUrl ? (
                                <AvatarImage src={account.profilePictureUrl} alt={account.displayName} />
                              ) : null}
                              <AvatarFallback className="text-xs">
                                {getProviderIcon(account.provider)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{account.displayName}</div>
                              <div className="text-xs text-muted-foreground capitalize">{account.provider.replace('_', ' ')}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button
                        onClick={handlePublish}
                        disabled={selectedAccountIds.length === 0 || publishMutation.isPending}
                        className="w-full"
                        data-testid="button-publish-now"
                      >
                        {publishMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Publishing to {selectedAccountIds.length} platform{selectedAccountIds.length !== 1 ? 's' : ''}...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Publish Now to {selectedAccountIds.length} Platform{selectedAccountIds.length !== 1 ? 's' : ''}
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6 border rounded-lg bg-muted/30">
                      <Link2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No accounts connected</p>
                      <p className="text-sm text-muted-foreground mb-3">Connect your social accounts to post directly</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab("accounts")}
                      >
                        <Link2 className="h-4 w-4 mr-2" />
                        Connect Accounts
                      </Button>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => {
                    setStep(1);
                    setGeneratedPost(null);
                    setSelectedAccountIds([]);
                    setFormData({
                      postType: "",
                      platforms: [],
                      outputStyle: "warm_hospitality",
                      eventName: "",
                      eventDate: "",
                      startTime: "",
                      endTime: "",
                      promotionDetails: "",
                      targetAudience: "",
                      tone: "classy",
                      cta: "reserve_now",
                      selectedHoliday: "",
                    });
                  }}
                  variant="outline"
                  className="w-full"
                  data-testid="button-create-another"
                >
                  Create Another Post
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="accounts" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Connect Your Accounts</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your social media accounts to post directly from this tool.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleConnectMeta} variant="outline" data-testid="button-connect-meta">
                    <Facebook className="h-4 w-4 mr-2 text-blue-600" />
                    Connect Facebook / Instagram
                  </Button>
                  <Button onClick={handleConnectGoogle} variant="outline" data-testid="button-connect-google">
                    <MapPin className="h-4 w-4 mr-2 text-red-500" />
                    Connect Google Business
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Connected Accounts</h3>
                {accountsLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : connectedAccounts && connectedAccounts.length > 0 ? (
                  <div className="space-y-2">
                    {connectedAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex flex-wrap items-center justify-between gap-2 p-3 border rounded-lg"
                        data-testid={`card-account-${account.id}`}
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <Avatar className="h-10 w-10">
                            {account.profilePictureUrl ? (
                              <AvatarImage src={account.profilePictureUrl} alt={account.displayName} />
                            ) : null}
                            <AvatarFallback>
                              {getProviderIcon(account.provider)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{account.displayName}</div>
                            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1">
                              {getProviderIcon(account.provider)}
                              <span className="capitalize">{account.provider.replace('_', ' ')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={account.status === 'active' ? 'default' : 'destructive'} data-testid={`badge-account-status-${account.id}`}>
                            {account.status}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => disconnectMutation.mutate(account.id)}
                            disabled={disconnectMutation.isPending}
                            data-testid={`button-disconnect-${account.id}`}
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Link2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No accounts connected yet</p>
                    <p className="text-sm">Connect your social media accounts above to start posting</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="holidays">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upcoming national days and holidays relevant to restaurants. Click to use as inspiration for a post.
              </p>
              {holidaysLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : holidays && holidays.length > 0 ? (
                <div className="space-y-2">
                  {holidays.slice(0, 10).map((holiday) => (
                    <div
                      key={holiday.id}
                      className="p-3 border rounded-lg hover-elevate cursor-pointer"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          postType: "holiday",
                          selectedHoliday: holiday.name,
                        });
                        setActiveTab("create");
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium">{holiday.name}</div>
                          <div className="text-xs text-muted-foreground">{holiday.date}</div>
                          {holiday.suggestedAngle && (
                            <div className="text-sm mt-1">{holiday.suggestedAngle}</div>
                          )}
                        </div>
                        <Badge variant="outline">{holiday.category}</Badge>
                      </div>
                      {holiday.suggestedTags && holiday.suggestedTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {holiday.suggestedTags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No upcoming holidays found.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                View your recent posts and their status across platforms.
              </p>
              {postHistory && postHistory.length > 0 ? (
                <div className="space-y-3">
                  {postHistory.slice(0, 10).map((post) => (
                    <div key={post.id} className="p-3 border rounded-lg">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm line-clamp-2">{post.caption}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Unknown'}
                          </div>
                        </div>
                        <Badge
                          variant={
                            post.status === 'posted' ? 'default' :
                            post.status === 'failed' ? 'destructive' :
                            post.status === 'partial' ? 'secondary' :
                            'outline'
                          }
                        >
                          {post.status === 'posted' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {post.status === 'failed' && <AlertCircle className="h-3 w-3 mr-1" />}
                          {post.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No posts yet</p>
                  <p className="text-sm">Your published posts will appear here</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <BrandVoiceSettingsPanel settings={brandSettings} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function BrandVoiceSettingsPanel({ settings }: { settings?: BrandVoiceSettings }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    voiceAdjectives: settings?.voiceAdjectives || ["warm", "welcoming"],
    defaultCta: settings?.defaultCta || "reserve",
    neverSayList: settings?.neverSayList?.join(", ") || "",
    emojiLevel: settings?.emojiLevel || "light",
    hashtagStyle: settings?.hashtagStyle || "minimal",
    restaurantName: settings?.restaurantName || "",
    location: settings?.location || "",
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        neverSayList: data.neverSayList
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const response = await apiRequest("POST", "/api/social-media/brand-settings", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-media/brand-settings"] });
      toast({ title: "Saved!", description: "Brand voice settings updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    },
  });

  const voiceOptions = ["warm", "confident", "welcoming", "premium", "playful", "professional"];

  const toggleVoice = (voice: string) => {
    setFormData((prev) => ({
      ...prev,
      voiceAdjectives: prev.voiceAdjectives.includes(voice)
        ? prev.voiceAdjectives.filter((v) => v !== voice)
        : [...prev.voiceAdjectives, voice],
    }));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Set your brand voice to keep posts consistent, even when different team members create them.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Restaurant Name</Label>
          <Input
            value={formData.restaurantName}
            onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
            placeholder="Your restaurant name"
            data-testid="input-restaurant-name"
          />
        </div>
        <div className="space-y-2">
          <Label>Location</Label>
          <Input
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Cedar Park, TX"
            data-testid="input-location"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Voice Adjectives</Label>
        <div className="flex flex-wrap gap-2">
          {voiceOptions.map((voice) => (
            <Badge
              key={voice}
              variant={formData.voiceAdjectives.includes(voice) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleVoice(voice)}
              data-testid={`badge-voice-${voice.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {voice}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Default CTA</Label>
          <Select
            value={formData.defaultCta}
            onValueChange={(v) => setFormData({ ...formData, defaultCta: v })}
          >
            <SelectTrigger data-testid="select-default-cta">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reserve">Reserve</SelectItem>
              <SelectItem value="walk_ins">Walk-ins Welcome</SelectItem>
              <SelectItem value="order_online">Order Online</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Emoji Level</Label>
          <Select
            value={formData.emojiLevel}
            onValueChange={(v) => setFormData({ ...formData, emojiLevel: v })}
          >
            <SelectTrigger data-testid="select-emoji-level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Hashtag Style</Label>
        <Select
          value={formData.hashtagStyle}
          onValueChange={(v) => setFormData({ ...formData, hashtagStyle: v })}
        >
          <SelectTrigger data-testid="select-hashtag-style">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="minimal">Minimal (3-5)</SelectItem>
            <SelectItem value="local">Local-focused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Never Say (comma-separated)</Label>
        <Input
          value={formData.neverSayList}
          onChange={(e) => setFormData({ ...formData, neverSayList: e.target.value })}
          placeholder="e.g., cheap, best ever, guaranteed"
          data-testid="input-never-say"
        />
        <p className="text-xs text-muted-foreground">
          Words to avoid in generated content
        </p>
      </div>

      <Button
        onClick={() => saveMutation.mutate(formData)}
        disabled={saveMutation.isPending}
        className="w-full"
        data-testid="button-save-brand-settings"
      >
        {saveMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Brand Voice Settings"
        )}
      </Button>
    </div>
  );
}
