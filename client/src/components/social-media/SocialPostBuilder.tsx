import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parse } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Sparkles,
  Image as ImageIcon,
  Settings,
  Clock,
  Copy,
  Check,
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
  X,
  Upload,
  Eye,
  CalendarIcon,
} from "lucide-react";
import { SiLinkedin, SiX, SiNextdoor } from "react-icons/si";
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
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([]);
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  const [aiFormData, setAiFormData] = useState({
    postType: "",
    outputStyle: "warm_hospitality",
    eventName: "",
    eventDate: format(new Date(), "yyyy-MM-dd"),
    startTime: "",
    endTime: "",
    promotionDetails: "",
    targetAudience: "",
    tone: "classy",
    cta: "reserve_now",
    selectedHoliday: "",
    postTypeData: {} as any,
  });

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

  const activeAccounts = connectedAccounts?.filter(a => a.status === 'active') || [];

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
      const msgParam = params.get("msg");
      const detail = params.get("detail");
      const msgInfo = msgParam ? ` Details: ${decodeURIComponent(msgParam)}` : "";
      const detailInfo = detail ? ` Details: ${decodeURIComponent(detail)}` : "";
      const errorMessages: Record<string, string> = {
        no_pages: `No Facebook Pages found.${diagInfo}`,
        invalid_state: "Connection session expired. Please try again.",
        oauth_failed: `Connection failed.${detailInfo || msgInfo || " Please try again."}`,
        missing_params: "Connection was incomplete. Please try again.",
        google_denied: "Google connection was denied or cancelled.",
        google_api_not_enabled: "The Google Business Profile API is not enabled in your Google Cloud project. Please enable the 'My Business Account Management API' and 'My Business Business Information API' in Google Cloud Console, then try again.",
        no_google_locations: "No Google Business Profile locations were found for this Google account. Make sure the Google account you're connecting has a verified Business Profile.",
        google_locations_failed: `Could not retrieve your Business Profile locations.${detailInfo || " The API may not be enabled in your Google Cloud project."}`,
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
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/social-media/generate-post", data);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedPost(data);
      setCaption(data.primaryCaption);
      setShowAiPanel(false);
      toast({ title: "Post generated!", description: "Your content is ready. Edit it below or publish." });
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
    mutationFn: async (data: { caption: string; platformTargets: number[]; postNow: boolean; generatedContent?: object; mediaUrls?: string[] }) => {
      const response = await apiRequest("POST", "/api/social-media/posts", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-media/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social-media/posts"] });

      const results = data.results || [];
      const failed = results.filter((r: any) => r.status === 'failed');
      const succeeded = results.filter((r: any) => r.status === 'success');

      if (failed.length > 0 && succeeded.length === 0) {
        toast({
          title: "Publishing Failed",
          description: failed.map((r: any) => `${r.provider}: ${r.errorMessage}`).join('; '),
          variant: "destructive",
        });
      } else if (failed.length > 0) {
        toast({
          title: "Partially Published",
          description: `${succeeded.length} succeeded, ${failed.length} failed: ${failed.map((r: any) => r.errorMessage).join('; ')}`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Published!", description: `Your post has been sent to ${succeeded.length} platform${succeeded.length !== 1 ? 's' : ''}.` });
      }

      setCaption("");
      setMediaUrl("");
      setGeneratedPost(null);
      setSelectedAccountIds([]);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to publish post. Please try again.", variant: "destructive" });
    },
  });

  const uploadFile = async (file: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file", description: "Please upload a JPEG, PNG, GIF, or WebP image.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Images must be under 10MB.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/social-media/upload-image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      const fullUrl = window.location.origin + data.url;
      setMediaUrl(fullUrl);
      toast({ title: "Image uploaded", description: "Your image is ready." });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload the image. Try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const handleConnectMeta = async () => {
    try {
      const response = await fetch("/api/oauth/meta/start", { credentials: "include" });
      const data = await response.json();
      if (data.authUrl) window.location.href = data.authUrl;
      else toast({ title: "Error", description: data.message || "Failed to start connection.", variant: "destructive" });
    } catch {
      toast({ title: "Error", description: "Failed to start connection.", variant: "destructive" });
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const response = await fetch("/api/oauth/google/start", { credentials: "include" });
      const data = await response.json();
      if (data.authUrl) window.location.href = data.authUrl;
      else toast({ title: "Error", description: data.message || "Failed to start connection.", variant: "destructive" });
    } catch {
      toast({ title: "Error", description: "Failed to start connection.", variant: "destructive" });
    }
  };

  const handleConnectLinkedIn = async () => {
    try {
      const response = await fetch("/api/oauth/linkedin/start", { credentials: "include" });
      const data = await response.json();
      if (data.authUrl) window.location.href = data.authUrl;
      else toast({ title: "Error", description: data.message || "Failed to start connection.", variant: "destructive" });
    } catch {
      toast({ title: "Error", description: "Failed to start connection.", variant: "destructive" });
    }
  };

  const handleConnectX = async () => {
    try {
      const response = await fetch("/api/oauth/x/start", { credentials: "include" });
      const data = await response.json();
      if (data.authUrl) window.location.href = data.authUrl;
      else toast({ title: "Error", description: data.message || "Failed to start connection.", variant: "destructive" });
    } catch {
      toast({ title: "Error", description: "Failed to start connection.", variant: "destructive" });
    }
  };

  const handlePublish = () => {
    if (selectedAccountIds.length === 0) {
      toast({ title: "Select channels", description: "Please select at least one channel to publish to.", variant: "destructive" });
      return;
    }
    if (!caption.trim()) {
      toast({ title: "Write something", description: "Please write a caption for your post.", variant: "destructive" });
      return;
    }

    publishMutation.mutate({
      caption: caption.trim(),
      platformTargets: selectedAccountIds,
      postNow: true,
      generatedContent: generatedPost || undefined,
      mediaUrls: mediaUrl ? [mediaUrl] : [],
    });
  };

  const toggleAccountSelection = (accountId: number) => {
    setSelectedAccountIds(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const selectAllAccounts = () => {
    if (selectedAccountIds.length === activeAccounts.length) {
      setSelectedAccountIds([]);
    } else {
      setSelectedAccountIds(activeAccounts.map(a => a.id));
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'facebook': return <Facebook className="h-3.5 w-3.5 text-blue-600" />;
      case 'instagram': return <Instagram className="h-3.5 w-3.5 text-pink-600" />;
      case 'google_business': return <MapPin className="h-3.5 w-3.5 text-red-500" />;
      case 'linkedin': return <SiLinkedin className="h-3.5 w-3.5 text-blue-700" />;
      case 'x': return <SiX className="h-3.5 w-3.5" />;
      default: return <Link2 className="h-3.5 w-3.5" />;
    }
  };

  const getProviderBadgeColor = (provider: string) => {
    switch (provider) {
      case 'facebook': return 'bg-blue-600';
      case 'instagram': return 'bg-gradient-to-tr from-purple-600 via-pink-500 to-orange-400';
      case 'google_business': return 'bg-blue-500';
      case 'linkedin': return 'bg-blue-700';
      case 'x': return 'bg-black dark:bg-white';
      default: return 'bg-muted-foreground';
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: "Copied!", description: "Text copied to clipboard." });
  };

  const handleAiGenerate = () => {
    if (!aiFormData.postType) {
      toast({ title: "Missing info", description: "Please select a post type.", variant: "destructive" });
      return;
    }

    const platforms = selectedAccountIds.map(id => {
      const acct = activeAccounts.find(a => a.id === id);
      return acct?.provider || '';
    }).filter(Boolean);

    generateMutation.mutate({
      ...aiFormData,
      platforms: platforms.length > 0 ? platforms : ['facebook', 'instagram'],
      postTypeData: aiFormData.postTypeData || {},
      mediaUrl: mediaUrl || "",
    });
  };

  const formatHolidayDate = (mmdd: string) => {
    const [month, day] = mmdd.split('-').map(Number);
    const today = new Date();
    const holidayDate = new Date(today.getFullYear(), month - 1, day);
    if (holidayDate < today) {
      holidayDate.setFullYear(holidayDate.getFullYear() + 1);
    }
    return holidayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getDaysUntilHoliday = (mmdd: string) => {
    const [month, day] = mmdd.split('-').map(Number);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const holidayDate = new Date(today.getFullYear(), month - 1, day);
    holidayDate.setHours(0, 0, 0, 0);
    if (holidayDate < today) {
      holidayDate.setFullYear(holidayDate.getFullYear() + 1);
    }
    const diffDays = Math.round((holidayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `In ${diffDays} days`;
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <TabsList>
            <TabsTrigger value="create" data-testid="tab-create-post">
              <Wand2 className="h-4 w-4 mr-2" />
              Create
            </TabsTrigger>
            <TabsTrigger value="accounts" data-testid="tab-accounts">
              <Link2 className="h-4 w-4 mr-2" />
              Channels
            </TabsTrigger>
            <TabsTrigger value="holidays" data-testid="tab-holidays">
              <PartyPopper className="h-4 w-4 mr-2" />
              Holidays
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <History className="h-4 w-4 mr-2" />
              Sent
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Settings className="h-4 w-4 mr-2" />
              Voice
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="create">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Left: Compose Panel */}
            <div className="lg:col-span-3 space-y-4">
              <Card
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`transition-colors ${isDragging ? 'ring-2 ring-primary ring-offset-2' : ''}`}
              >
                <CardContent className="p-4 space-y-4">
                  {/* Full-card drag overlay */}
                  {isDragging && (
                    <div className="flex items-center justify-center p-6 border-2 border-dashed border-primary rounded-md bg-primary/5">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <Upload className="h-8 w-8 text-primary" />
                        <span className="text-sm font-medium text-primary">Drop your image here</span>
                      </div>
                    </div>
                  )}
                  {/* Channel selector row */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {selectedAccountIds.length > 0
                          ? `${selectedAccountIds.length} channel${selectedAccountIds.length !== 1 ? 's' : ''} selected`
                          : 'Select channels'}
                      </span>
                      {activeAccounts.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={selectAllAccounts} data-testid="button-select-all-accounts">
                          {selectedAccountIds.length === activeAccounts.length ? 'Deselect All' : 'Select All'}
                        </Button>
                      )}
                    </div>

                    {activeAccounts.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {activeAccounts.map((account) => {
                          const isSelected = selectedAccountIds.includes(account.id);
                          return (
                            <button
                              key={account.id}
                              onClick={() => toggleAccountSelection(account.id)}
                              className={`relative rounded-full transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-2' : 'opacity-50 hover:opacity-80'}`}
                              title={`${account.displayName} (${account.provider.replace('_', ' ')})`}
                              data-testid={`channel-avatar-${account.id}`}
                            >
                              <Avatar className="h-10 w-10">
                                {account.profilePictureUrl ? (
                                  <AvatarImage src={account.profilePictureUrl} alt={account.displayName} />
                                ) : null}
                                <AvatarFallback className="text-xs font-medium">
                                  {account.displayName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center text-white ${getProviderBadgeColor(account.provider)}`}>
                                {account.provider === 'facebook' && <Facebook className="h-2.5 w-2.5" />}
                                {account.provider === 'instagram' && <Instagram className="h-2.5 w-2.5" />}
                                {account.provider === 'google_business' && <MapPin className="h-2.5 w-2.5" />}
                                {account.provider === 'linkedin' && <SiLinkedin className="h-2.5 w-2.5" />}
                                {account.provider === 'x' && <SiX className="h-2.5 w-2.5" />}
                              </span>
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setActiveTab("accounts")}
                          className="h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                          title="Add channel"
                          data-testid="button-add-channel"
                        >
                          <span className="text-lg leading-none">+</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                        <AlertCircle className="h-4 w-4" />
                        <span>No channels connected.</span>
                        <Button variant="ghost" size="sm" onClick={() => setActiveTab("accounts")} data-testid="button-connect-accounts">
                          Connect now
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Large textarea */}
                  <Textarea
                    placeholder="What would you like to share?"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={8}
                    className="text-base resize-none border-0 focus-visible:ring-0 shadow-none"
                    data-testid="textarea-caption"
                  />

                  {/* Image area */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-file-upload"
                  />
                  {mediaUrl ? (
                    <div className="relative rounded-md border overflow-hidden">
                      <img src={mediaUrl} alt="Post media" className="w-full max-h-64 object-cover" />
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute top-2 right-2"
                        onClick={() => setMediaUrl("")}
                        data-testid="button-remove-image"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      ref={dropZoneRef}
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-md p-6 cursor-pointer transition-colors ${
                        isDragging
                          ? 'border-primary bg-primary/5'
                          : 'border-muted-foreground/20 hover:border-muted-foreground/40'
                      }`}
                      data-testid="dropzone-image"
                    >
                      <div className="flex flex-col items-center gap-2 text-center">
                        {isUploading ? (
                          <>
                            <Loader2 className="h-6 w-6 text-primary animate-spin" />
                            <div className="text-sm text-muted-foreground">Uploading...</div>
                          </>
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-muted-foreground/50" />
                            <div className="text-sm text-muted-foreground">
                              {isDragging ? (
                                <span className="text-primary font-medium">Drop your image here</span>
                              ) : (
                                <>Drag & drop an image, or <span className="text-primary">click to browse</span></>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground/60">JPEG, PNG, GIF, WebP up to 10MB</div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bottom toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        variant={showAiPanel ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowAiPanel(!showAiPanel)}
                        data-testid="button-ai-assistant"
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        AI Assistant
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                        className="lg:hidden"
                        data-testid="button-toggle-preview"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        onClick={handlePublish}
                        disabled={!caption.trim() || selectedAccountIds.length === 0 || publishMutation.isPending}
                        data-testid="button-publish-now"
                      >
                        {publishMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Publishing...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Publish Now
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Assistant panel (collapsible below compose) */}
              {showAiPanel && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        AI Post Generator
                      </span>
                      <Button size="icon" variant="ghost" onClick={() => setShowAiPanel(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Post Type</Label>
                        <Select value={aiFormData.postType} onValueChange={(v) => setAiFormData({ ...aiFormData, postType: v })}>
                          <SelectTrigger data-testid="select-post-type">
                            <SelectValue placeholder="What are you posting about?" />
                          </SelectTrigger>
                          <SelectContent>
                            {POST_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Style</Label>
                        <Select value={aiFormData.outputStyle} onValueChange={(v) => setAiFormData({ ...aiFormData, outputStyle: v })}>
                          <SelectTrigger data-testid="select-output-style">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OUTPUT_STYLES.map((style) => (
                              <SelectItem key={style.value} value={style.value}>{style.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Event / Item Name</Label>
                        <Input
                          placeholder="e.g., Jazz Night, Wagyu Ribeye"
                          value={aiFormData.eventName}
                          onChange={(e) => setAiFormData({ ...aiFormData, eventName: e.target.value })}
                          data-testid="input-event-name"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                              data-testid="input-event-date"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {aiFormData.eventDate
                                ? format(parse(aiFormData.eventDate, "yyyy-MM-dd", new Date()), "MMM d, yyyy")
                                : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={aiFormData.eventDate ? parse(aiFormData.eventDate, "yyyy-MM-dd", new Date()) : undefined}
                              onSelect={(date) => setAiFormData({ ...aiFormData, eventDate: date ? format(date, "yyyy-MM-dd") : "" })}
                              initialFocus
                              data-testid="calendar-event-date"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Target Audience</Label>
                        <Select value={aiFormData.targetAudience} onValueChange={(v) => setAiFormData({ ...aiFormData, targetAudience: v })}>
                          <SelectTrigger data-testid="select-target-audience">
                            <SelectValue placeholder="Who is this for?" />
                          </SelectTrigger>
                          <SelectContent>
                            {TARGET_AUDIENCES.map((aud) => (
                              <SelectItem key={aud.value} value={aud.value}>{aud.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Tone</Label>
                        <Select value={aiFormData.tone} onValueChange={(v) => setAiFormData({ ...aiFormData, tone: v })}>
                          <SelectTrigger data-testid="select-tone">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TONES.map((tone) => (
                              <SelectItem key={tone.value} value={tone.value}>{tone.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Additional Details</Label>
                      <Textarea
                        placeholder="Tell the AI more about this post..."
                        value={aiFormData.promotionDetails}
                        onChange={(e) => setAiFormData({ ...aiFormData, promotionDetails: e.target.value })}
                        rows={2}
                        data-testid="textarea-promotion-details"
                      />
                    </div>

                    {holidays && holidays.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-muted-foreground mr-1">Upcoming:</span>
                        {holidays.slice(0, 5).map((holiday) => (
                          <Badge
                            key={holiday.id}
                            variant={aiFormData.selectedHoliday === holiday.name ? "default" : "outline"}
                            className="cursor-pointer text-xs"
                            onClick={() =>
                              setAiFormData({
                                ...aiFormData,
                                selectedHoliday: aiFormData.selectedHoliday === holiday.name ? "" : holiday.name,
                              })
                            }
                            data-testid={`badge-holiday-${holiday.id}`}
                          >
                            {holiday.name}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <Button
                      onClick={handleAiGenerate}
                      disabled={generateMutation.isPending || !aiFormData.postType}
                      className="w-full"
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
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: Preview Panel */}
            <div className={`lg:col-span-2 ${showPreview ? '' : 'hidden lg:block'}`}>
              <Card className="sticky top-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex flex-wrap items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Post Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {caption ? (
                    <>
                      {/* Preview mock */}
                      <div className="border rounded-md overflow-hidden">
                        <div className="p-3 flex items-center gap-2 border-b bg-muted/30">
                          <div className="h-8 w-8 rounded-full bg-muted" />
                          <div>
                            <div className="text-xs font-medium">{brandSettings?.restaurantName || 'Your Restaurant'}</div>
                            <div className="text-[10px] text-muted-foreground">Just now</div>
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-sm whitespace-pre-wrap" data-testid="text-preview-caption">{caption}</p>
                        </div>
                        {mediaUrl && (
                          <img src={mediaUrl} alt="Preview" className="w-full max-h-48 object-cover border-t" />
                        )}
                        {generatedPost?.hashtags && generatedPost.hashtags.length > 0 && (
                          <div className="px-3 pb-3 flex flex-wrap gap-1">
                            {generatedPost.hashtags.map((tag, i) => (
                              <span key={i} className="text-xs text-primary">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Copy actions */}
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(caption, "caption")}
                          data-testid="button-copy-caption"
                        >
                          {copiedField === "caption" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                          Copy Caption
                        </Button>
                        {generatedPost?.hashtags && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(generatedPost.hashtags.join(" "), "hashtags")}
                            data-testid="button-copy-hashtags"
                          >
                            {copiedField === "hashtags" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                            Hashtags
                          </Button>
                        )}
                      </div>

                      {/* Short caption and story overlays */}
                      {generatedPost?.shortCaption && (
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <Label className="text-xs">Short Caption</Label>
                            <Button size="icon" variant="ghost" onClick={() => copyToClipboard(generatedPost.shortCaption, "short")} data-testid="button-copy-short">
                              {copiedField === "short" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                          <p className="text-xs bg-muted rounded p-2" data-testid="text-short-caption">{generatedPost.shortCaption}</p>
                        </div>
                      )}

                      {generatedPost?.suggestedPostTime && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded p-2" data-testid="text-suggested-time">
                          <Clock className="h-3 w-3" />
                          Best time: <strong>{generatedPost.suggestedPostTime}</strong>
                        </div>
                      )}

                      {/* Selected channels summary */}
                      {selectedAccountIds.length > 0 && (
                        <div className="space-y-1">
                          <Label className="text-xs">Publishing to</Label>
                          <div className="flex flex-wrap gap-1">
                            {selectedAccountIds.map(id => {
                              const acct = activeAccounts.find(a => a.id === id);
                              if (!acct) return null;
                              return (
                                <Badge key={id} variant="secondary" className="text-xs" data-testid={`badge-publish-target-${id}`}>
                                  {getProviderIcon(acct.provider)}
                                  <span className="ml-1">{acct.displayName}</span>
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                      <div className="h-16 w-12 border-2 border-dashed border-muted-foreground/20 rounded mb-4 flex items-center justify-center">
                        <div className="space-y-1">
                          <div className="h-1.5 w-6 bg-muted-foreground/20 rounded" />
                          <div className="h-1.5 w-8 bg-muted-foreground/20 rounded" />
                          <div className="h-4 w-8 bg-muted-foreground/10 rounded mt-1" />
                        </div>
                      </div>
                      <p className="text-sm">See your post's preview here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Channels / Accounts Tab */}
        <TabsContent value="accounts">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">Channels</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleConnectMeta} variant="outline" size="sm" data-testid="button-connect-meta">
                    <Facebook className="h-4 w-4 mr-2 text-blue-600" />
                    Connect Facebook / Instagram
                  </Button>
                  <Button onClick={handleConnectGoogle} variant="outline" size="sm" data-testid="button-connect-google">
                    <MapPin className="h-4 w-4 mr-2 text-red-500" />
                    Connect Google Business
                  </Button>
                  <Button onClick={handleConnectLinkedIn} variant="outline" size="sm" data-testid="button-connect-linkedin">
                    <SiLinkedin className="h-4 w-4 mr-2 text-blue-700" />
                    Connect LinkedIn
                  </Button>
                  <Button onClick={handleConnectX} variant="outline" size="sm" data-testid="button-connect-x">
                    <SiX className="h-4 w-4 mr-2" />
                    Connect X
                  </Button>
                  <Button variant="outline" size="sm" disabled data-testid="button-connect-nextdoor">
                    <SiNextdoor className="h-4 w-4 mr-2 text-green-600" />
                    Nextdoor (Coming Soon)
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {accountsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : connectedAccounts && connectedAccounts.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground mb-3">
                    {connectedAccounts.filter(a => a.status === 'active').length}/{connectedAccounts.length} Channels connected
                  </div>
                  {connectedAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-3 border rounded-md"
                      data-testid={`card-account-${account.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            {account.profilePictureUrl ? (
                              <AvatarImage src={account.profilePictureUrl} alt={account.displayName} />
                            ) : null}
                            <AvatarFallback>{account.displayName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center text-white ${getProviderBadgeColor(account.provider)}`}>
                            {account.provider === 'facebook' && <Facebook className="h-2.5 w-2.5" />}
                            {account.provider === 'instagram' && <Instagram className="h-2.5 w-2.5" />}
                            {account.provider === 'google_business' && <MapPin className="h-2.5 w-2.5" />}
                            {account.provider === 'linkedin' && <SiLinkedin className="h-2.5 w-2.5" />}
                            {account.provider === 'x' && <SiX className="h-2.5 w-2.5" />}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-sm">{account.displayName}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {account.provider === 'facebook' ? 'Facebook Page' :
                             account.provider === 'instagram' ? 'Instagram Professional Account' :
                             account.provider === 'google_business' ? 'Google Business Profile' :
                             account.provider === 'linkedin' ? 'LinkedIn Profile' :
                             account.provider === 'x' ? 'X (Twitter) Account' :
                             account.provider.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={account.status === 'active' ? 'default' : 'destructive'} data-testid={`badge-account-status-${account.id}`}>
                          {account.status}
                        </Badge>
                        <Button
                          size="icon"
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
                <div className="text-center py-12 text-muted-foreground">
                  <Link2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No channels connected yet</p>
                  <p className="text-sm mt-1">Connect your social media accounts above to start posting</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Holidays Tab */}
        <TabsContent value="holidays">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Upcoming Holidays</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                National days and holidays relevant to restaurants. Click one to generate a post about it.
              </p>
              {holidaysLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : holidays && holidays.length > 0 ? (
                <div className="space-y-2">
                  {holidays.slice(0, 10).map((holiday) => (
                    <div
                      key={holiday.id}
                      className="p-3 border rounded-md hover-elevate cursor-pointer"
                      onClick={() => {
                        setAiFormData({ ...aiFormData, postType: "holiday", selectedHoliday: holiday.name });
                        setShowAiPanel(true);
                        setActiveTab("create");
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-sm">{holiday.name}</div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatHolidayDate(holiday.date)}</span>
                            <Badge variant="secondary" className="text-xs">{getDaysUntilHoliday(holiday.date)}</Badge>
                          </div>
                          {holiday.suggestedAngle && <div className="text-sm mt-1">{holiday.suggestedAngle}</div>}
                        </div>
                        <Badge variant="outline">{holiday.category}</Badge>
                      </div>
                      {holiday.suggestedTags && holiday.suggestedTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {holiday.suggestedTags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No upcoming holidays found.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History / Sent Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sent Posts</CardTitle>
            </CardHeader>
            <CardContent>
              {postHistory && postHistory.length > 0 ? (
                <div className="space-y-2">
                  {postHistory.slice(0, 20).map((post) => (
                    <div key={post.id} className="p-3 border rounded-md">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
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
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No posts yet</p>
                  <p className="text-sm mt-1">Your published posts will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brand Voice Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Brand Voice Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <BrandVoiceSettingsPanel settings={brandSettings} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
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
        neverSayList: data.neverSayList.split(",").map((s) => s.trim()).filter(Boolean),
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
          <Select value={formData.defaultCta} onValueChange={(v) => setFormData({ ...formData, defaultCta: v })}>
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
          <Select value={formData.emojiLevel} onValueChange={(v) => setFormData({ ...formData, emojiLevel: v })}>
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
        <Select value={formData.hashtagStyle} onValueChange={(v) => setFormData({ ...formData, hashtagStyle: v })}>
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
        <p className="text-xs text-muted-foreground">Words to avoid in generated content</p>
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
