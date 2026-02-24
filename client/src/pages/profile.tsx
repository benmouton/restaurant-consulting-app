import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { isNativeApp, hapticSuccess, hapticTap } from "@/lib/native";
import { useBiometric, usePushNotifications } from "@/hooks/use-native-features";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MapPin, 
  Building2, 
  Shield, 
  CreditCard, 
  Calendar,
  AlertTriangle,
  Loader2,
  Save,
  ExternalLink,
  Camera,
  ChevronDown,
  Trash2,
  Download,
  Info
} from "lucide-react";
import OrganizationManagement from "@/components/OrganizationManagement";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "Not set";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().optional(),
  restaurantName: z.string().optional(),
  role: z.enum(["owner", "gm", "manager"]).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const roleOptions = [
  { value: "owner", label: "Owner", description: "Full access to all features including financials" },
  { value: "gm", label: "General Manager", description: "Operations, training, consulting, and staff management" },
  { value: "manager", label: "Manager", description: "Shift operations, checklists, and training" },
];

const getRoleLabelFromValue = (role: string | null | undefined): string => {
  const option = roleOptions.find(opt => opt.value === role);
  return option?.label || "Not set";
};

interface ProfileData {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  restaurantName: string | null;
  role: string | null;
  profileImageUrl: string | null;
  isAdmin: boolean;
  subscriptionStatus: string | null;
  subscriptionDetails: {
    id: string;
    status: string;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
  } | null;
  createdAt: string;
}

function NativeSettingsCard() {
  const { available: bioAvailable, enabled: bioEnabled, toggle: bioToggle } = useBiometric();
  const { registered: pushRegistered, register: pushRegister } = usePushNotifications();
  const [pushLoading, setPushLoading] = useState(false);

  const handlePushRegister = async () => {
    setPushLoading(true);
    await pushRegister();
    hapticSuccess();
    setPushLoading(false);
  };

  return (
    <Card data-testid="card-device-settings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Device Settings
        </CardTitle>
        <CardDescription>Native app preferences for this device</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {bioAvailable && (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Require Face ID / Touch ID</p>
              <p className="text-xs text-muted-foreground">
                Protect your account with biometric authentication on app launch
              </p>
            </div>
            <Switch
              checked={bioEnabled}
              onCheckedChange={() => { bioToggle(); hapticTap(); }}
              data-testid="switch-biometric"
            />
          </div>
        )}

        <Separator />

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Push Notifications</p>
            <p className="text-xs text-muted-foreground">
              Get notified about shift reminders, training deadlines, and certification expirations
            </p>
          </div>
          {pushRegistered ? (
            <Badge variant="secondary" data-testid="badge-push-enabled">Enabled</Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handlePushRegister}
              disabled={pushLoading}
              data-testid="button-enable-push"
            >
              {pushLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enable"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [dangerZoneOpen, setDangerZoneOpen] = useState(false);

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ["/api/user/profile"],
    enabled: !!user,
  });

  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["/api/organization/members"],
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      address: "",
      restaurantName: "",
      role: undefined,
    },
  });

  useEffect(() => {
    if (profile && isEditing) {
      form.reset({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        phone: profile.phone || "",
        address: profile.address || "",
        restaurantName: profile.restaurantName || "",
        role: (profile.role as "owner" | "gm" | "manager") || undefined,
      });
    }
  }, [profile, isEditing, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const response = await apiRequest("PATCH", "/api/user/profile", {
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        restaurantName: data.restaurantName || undefined,
        role: data.role || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("photo", file);
      const response = await fetch("/api/user/profile/photo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      toast({
        title: "Photo updated",
        description: "Your profile photo has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/cancel");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process cancellation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/user/account");
    },
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    form.reset({
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
      restaurantName: profile?.restaurantName || "",
      role: (profile?.role as "owner" | "gm" | "manager") || undefined,
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    form.reset();
  };

  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  const handlePhotoUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: "Please choose an image smaller than 5MB.",
            variant: "destructive",
          });
          return;
        }
        uploadPhotoMutation.mutate(file);
      }
    };
    input.click();
  };

  const handleExportData = async () => {
    try {
      const response = await fetch("/api/user/export", { credentials: "include" });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-data-export.json";
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Data exported",
        description: "Your data has been downloaded.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (timestamp: number | null | undefined) => {
    if (!timestamp || timestamp <= 0) {
      return "Not available";
    }
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasActiveSubscription = profile?.subscriptionStatus === "active" || profile?.isAdmin;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8 flex-wrap">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/")}
            data-testid="btn-back-home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground">Manage your profile and subscription</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Your account details and contact information</CardDescription>
                </div>
                {!isEditing ? (
                  <Button variant="outline" onClick={handleEdit} data-testid="btn-edit-profile">
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={handleCancel} data-testid="btn-cancel-edit">
                      Cancel
                    </Button>
                    <Button 
                      onClick={form.handleSubmit(onSubmit)} 
                      disabled={updateProfileMutation.isPending}
                      data-testid="btn-save-profile"
                    >
                      {updateProfileMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="relative">
                        <Avatar className="h-16 w-16">
                          {profile?.profileImageUrl ? (
                            <AvatarImage src={profile.profileImageUrl} alt="Profile" />
                          ) : null}
                          <AvatarFallback className="text-lg">
                            {profile?.firstName?.[0]}{profile?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <button
                          type="button"
                          onClick={handlePhotoUpload}
                          className="absolute bottom-0 right-0 rounded-full bg-primary text-primary-foreground p-1"
                          data-testid="btn-upload-photo"
                        >
                          {uploadPhotoMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Camera className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground">Click the camera icon to upload a photo (JPEG, PNG, or WebP, max 5MB)</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter first name" 
                                data-testid="input-first-name"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter last name" 
                                data-testid="input-last-name"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input 
                                type="tel"
                                placeholder="(512) 656-1026" 
                                data-testid="input-phone"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="restaurantName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Restaurant Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter restaurant name" 
                                data-testid="input-restaurant"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter address" 
                                data-testid="input-address"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel>Role</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-role">
                                  <SelectValue placeholder="Select your role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {roleOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    <div className="flex flex-col">
                                      <span>{option.label}</span>
                                      <span className="text-xs text-muted-foreground">{option.description}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      {profile?.profileImageUrl ? (
                        <AvatarImage src={profile.profileImageUrl} alt="Profile" />
                      ) : null}
                      <AvatarFallback className="font-bold">
                        {profile?.firstName?.[0]}{profile?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold" data-testid="text-user-name">
                        {profile?.firstName} {profile?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid="text-user-email">
                        {profile?.email}
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Phone:</span>
                      <span data-testid="text-phone">{formatPhoneNumber(profile?.phone)}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-muted-foreground shrink-0">Restaurant:</span>
                      <span className="break-words" data-testid="text-restaurant">{profile?.restaurantName || "Not set"}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-muted-foreground shrink-0">Address:</span>
                      <span className="break-words" data-testid="text-address">{profile?.address || "Not set"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Role:</span>
                      <span data-testid="text-role">{getRoleLabelFromValue(profile?.role)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role & Access
              </CardTitle>
              <CardDescription>Your permissions and access level in the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-muted-foreground">Restaurant Role:</span>
                <Badge variant="secondary" data-testid="badge-role">{getRoleLabelFromValue(profile?.role)}</Badge>
              </div>
              {profile?.isAdmin && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-muted-foreground">Admin Status:</span>
                  <Badge variant="default" data-testid="badge-admin">Admin</Badge>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Your role determines which features you can access. You can change your role in the Personal Information section above.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription
              </CardTitle>
              <CardDescription>Your subscription status and billing information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-muted-foreground">Status:</span>
                <Badge 
                  variant={hasActiveSubscription ? "default" : "secondary"}
                  data-testid="badge-subscription-status"
                >
                  {profile?.isAdmin ? "Admin (Free)" : profile?.subscriptionStatus || "Inactive"}
                </Badge>
              </div>

              {profile?.subscriptionDetails && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Plan:</span>
                      <span data-testid="text-plan-name">Restaurant Operations Pro</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Price:</span>
                      <span data-testid="text-plan-price">$10/month</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Billing cycle:</span>
                      <span>Monthly</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Next billing:</span>
                      <span data-testid="text-next-billing">
                        {formatDate(profile.subscriptionDetails.currentPeriodEnd)}
                      </span>
                    </div>
                  </div>
                  
                  {profile.subscriptionDetails.cancelAtPeriodEnd && (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950 p-3 rounded-md" data-testid="alert-cancel-pending">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span className="text-sm">
                        Your subscription will cancel on {formatDate(profile.subscriptionDetails.currentPeriodEnd)}
                      </span>
                    </div>
                  )}
                </>
              )}

              {!profile?.isAdmin && profile?.subscriptionStatus === "active" && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">Manage your subscription</p>
                      <p className="text-xs text-muted-foreground">
                        Update payment method, view invoices, or cancel
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          data-testid="btn-manage-subscription"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Manage Subscription
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Manage Subscription</AlertDialogTitle>
                          <AlertDialogDescription>
                            You'll be redirected to the billing portal where you can update your payment method, 
                            view invoices, or cancel your subscription. Are you sure you want to proceed?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="btn-cancel-dialog">Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => cancelSubscriptionMutation.mutate()}
                            disabled={cancelSubscriptionMutation.isPending}
                            data-testid="btn-confirm-manage"
                          >
                            {cancelSubscriptionMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Open Billing Portal"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              )}

              {!profile?.isAdmin && !hasActiveSubscription && (
                <div className="space-y-3">
                  <Separator />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">Upgrade to unlock all features</p>
                      <p className="text-xs text-muted-foreground">
                        Get access to the consultant, financial analysis, training templates, and more for $10/month
                      </p>
                    </div>
                    <Button 
                      onClick={() => navigate("/subscribe")}
                      data-testid="btn-subscribe"
                    >
                      Subscribe Now
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <OrganizationManagement />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="text-sm" data-testid="text-member-since">
                  <span className="text-muted-foreground">Member since: </span>
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }) : "Unknown"}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Team members: </span>
                  <span data-testid="text-team-count">{members.length || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {isNativeApp() && <NativeSettingsCard />}

          <Collapsible open={dangerZoneOpen} onOpenChange={setDangerZoneOpen}>
            <Card className={dangerZoneOpen ? "border-destructive/50" : ""}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      Danger Zone
                    </CardTitle>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${dangerZoneOpen ? "rotate-180" : ""}`} />
                  </div>
                  <CardDescription>Irreversible actions for your account</CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">Export My Data</p>
                      <p className="text-xs text-muted-foreground">
                        Download all your data including profile, conversations, and settings
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleExportData}
                      data-testid="btn-export-data"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-destructive">Delete Account</p>
                      <p className="text-xs text-muted-foreground">
                        Permanently delete your account and all associated data. This cannot be undone.
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          data-testid="btn-delete-account"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your account, 
                            all your data, conversations, and remove you from any organizations.
                            {hasActiveSubscription && " Your active subscription will also be cancelled."}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteAccountMutation.mutate()}
                            disabled={deleteAccountMutation.isPending}
                            className="bg-destructive text-destructive-foreground"
                            data-testid="btn-confirm-delete-account"
                          >
                            {deleteAccountMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Yes, Delete My Account"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
