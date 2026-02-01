import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
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
  ExternalLink
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
  { value: "gm", label: "General Manager", description: "Operations, training, AI, and staff management" },
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

export default function ProfilePage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { roleLabel } = useRole();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ["/api/user/profile"],
    enabled: !!user,
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
        <div className="flex items-center gap-4 mb-8">
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
                  <div className="flex gap-2">
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
                  <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
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
                              placeholder="Enter phone number" 
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
                  </form>
                </Form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                      {profile?.firstName?.[0]}{profile?.lastName?.[0]}
                    </div>
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
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Phone:</span>
                      <span data-testid="text-phone">{profile?.phone || "Not set"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Restaurant:</span>
                      <span data-testid="text-restaurant">{profile?.restaurantName || "Not set"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Address:</span>
                      <span data-testid="text-address">{profile?.address || "Not set"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-muted-foreground" />
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
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">Restaurant Role:</span>
                <Badge variant="secondary" data-testid="badge-role">{getRoleLabelFromValue(profile?.role)}</Badge>
              </div>
              {profile?.isAdmin && (
                <div className="flex items-center gap-3">
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
              <div className="flex items-center gap-3">
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
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Next billing date:</span>
                    <span data-testid="text-next-billing">
                      {formatDate(profile.subscriptionDetails.currentPeriodEnd)}
                    </span>
                  </div>
                  
                  {profile.subscriptionDetails.cancelAtPeriodEnd && (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950 p-3 rounded-lg" data-testid="alert-cancel-pending">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">
                        Your subscription will cancel on {formatDate(profile.subscriptionDetails.currentPeriodEnd)}
                      </span>
                    </div>
                  )}
                </>
              )}

              {!profile?.isAdmin && profile?.subscriptionStatus === "active" && (
                <Separator />
              )}

              {!profile?.isAdmin && profile?.subscriptionStatus === "active" && (
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
              )}

              {!profile?.isAdmin && !profile?.subscriptionStatus && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">No active subscription</p>
                    <p className="text-xs text-muted-foreground">
                      Subscribe to access all features
                    </p>
                  </div>
                  <Button 
                    onClick={() => navigate("/subscribe")}
                    data-testid="btn-subscribe"
                  >
                    Subscribe Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <OrganizationManagement />

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground" data-testid="text-member-since">
                Member since: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }) : "Unknown"}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
