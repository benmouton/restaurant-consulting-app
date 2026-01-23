import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import type { RestaurantHoliday, BrandVoiceSettings } from "@shared/schema";

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
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Social Media Post Builder
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="create" className="text-xs sm:text-sm" data-testid="tab-create-post">
              <Wand2 className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Create</span>
            </TabsTrigger>
            <TabsTrigger value="holidays" className="text-xs sm:text-sm" data-testid="tab-holidays">
              <PartyPopper className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Holidays</span>
            </TabsTrigger>
            <TabsTrigger value="library" className="text-xs sm:text-sm" data-testid="tab-library">
              <Image className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Library</span>
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
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Output Style</Label>
                  <Select
                    value={formData.outputStyle}
                    onValueChange={(v) => setFormData({ ...formData, outputStyle: v })}
                  >
                    <SelectTrigger>
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
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
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

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
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
                      <SelectTrigger>
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
                      <SelectTrigger>
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
                    <SelectTrigger>
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
                    <Label className="flex items-center gap-2">
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
                        >
                          {holiday.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Primary Caption</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(generatedPost.primaryCaption, "primary")}
                    >
                      {copiedField === "primary" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                    {generatedPost.primaryCaption}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Short Caption</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(generatedPost.shortCaption, "short")}
                    >
                      {copiedField === "short" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    {generatedPost.shortCaption}
                  </div>
                </div>

                {generatedPost.storyOverlays.length > 0 && (
                  <div className="space-y-2">
                    <Label>Story Text Overlays</Label>
                    <div className="space-y-2">
                      {generatedPost.storyOverlays.map((overlay, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="flex-1 p-2 bg-muted rounded text-sm">{overlay}</div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => copyToClipboard(overlay, `overlay-${i}`)}
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
                  <div className="flex items-center justify-between">
                    <Label>Hashtags</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(generatedPost.hashtags.join(" "), "hashtags")}
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
                      <Badge key={i} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    Best time to post: <strong>{generatedPost.suggestedPostTime}</strong>
                  </span>
                </div>

                <Button
                  onClick={() => {
                    setStep(1);
                    setGeneratedPost(null);
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

          <TabsContent value="library">
            <div className="text-center py-8">
              <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Content Library</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload and organize photos for your social posts. Coming soon!
              </p>
              <Button variant="outline" disabled>
                Upload Photos
              </Button>
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
          />
        </div>
        <div className="space-y-2">
          <Label>Location</Label>
          <Input
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Cedar Park, TX"
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
            <SelectTrigger>
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
            <SelectTrigger>
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
          <SelectTrigger>
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
