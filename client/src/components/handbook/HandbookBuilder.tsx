import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Settings,
  FileText,
  Save,
  Printer,
  Building2,
  Phone,
  Mail,
  Globe,
  Users,
  Shirt,
  Calendar,
  Clock,
  Loader2,
  X,
  Shield,
  Check,
  Download,
  Copy,
  Plus,
  ChefHat,
  Star,
  Heart,
  UserCircle,
  Monitor,
  Coffee,
  Wine,
} from "lucide-react";
import type { HandbookSettings } from "@shared/schema";

const defaultHolidays = ["Thanksgiving Day", "Christmas Day", "Easter Sunday"];
const defaultStations = ["Grill", "Sauté", "Fry", "Salad", "Expo", "Dish"];

const STANDARD_POLICIES = [
  { key: "attendance", label: "Attendance & Punctuality", desc: "Late policy, no-call/no-show consequences, call-in procedures" },
  { key: "discipline", label: "Progressive Discipline", desc: "Verbal warning, written warning, suspension, termination steps" },
  { key: "harassment", label: "Harassment & Discrimination", desc: "Zero-tolerance policy, reporting procedures, investigation process" },
  { key: "substance", label: "Substance Abuse Policy", desc: "Drug-free workplace, testing policy, consequences" },
  { key: "cellPhone", label: "Cell Phone Policy", desc: "Phone usage during shifts, emergency exceptions" },
  { key: "cashHandling", label: "Cash Handling Procedures", desc: "Till management, cash drops, shortage accountability" },
  { key: "foodSafety", label: "Food Safety & Hygiene", desc: "Handwashing, temperature control, cross-contamination prevention" },
  { key: "scheduling", label: "Scheduling & Shift Swaps", desc: "Schedule posting, swap procedures, availability requirements" },
  { key: "resignation", label: "Resignation & Termination", desc: "Notice period, final paycheck, return of property" },
  { key: "socialMedia", label: "Social Media Policy", desc: "Online conduct, restaurant mentions, photo/video guidelines" },
  { key: "alcohol", label: "Alcohol Service Policy", desc: "ID checking, intoxication signs, refusal procedures" },
  { key: "tipPolicy", label: "Tip Policy", desc: "Pooled vs individual tips, tip-out percentage, reporting requirements" },
];

const schedulingApps = [
  { value: "homebase", label: "Homebase" },
  { value: "7shifts", label: "7shifts" },
  { value: "hotschedules", label: "HotSchedules" },
  { value: "sling", label: "Sling" },
  { value: "when_i_work", label: "When I Work" },
  { value: "deputy", label: "Deputy" },
  { value: "other", label: "Other" },
  { value: "none", label: "None / Paper Schedule" },
];

const posSystems = [
  { value: "toast", label: "Toast" },
  { value: "square", label: "Square" },
  { value: "clover", label: "Clover" },
  { value: "lightspeed", label: "Lightspeed" },
  { value: "touchbistro", label: "TouchBistro" },
  { value: "aloha", label: "Aloha" },
  { value: "other", label: "Other" },
];

const tippingOptions = [
  { value: "individual", label: "Individual Tips" },
  { value: "pool_all", label: "Tip Pool (all staff)" },
  { value: "pool_foh", label: "Tip Pool (FOH only)" },
  { value: "service_charge", label: "Service Charge Included" },
  { value: "no_tips", label: "No Tips" },
];

const servicePeriodOptions = ["Breakfast", "Brunch", "Lunch", "Happy Hour", "Dinner", "Late Night", "Catering", "Events"];

const allergenOptionsList = ["Gluten-Free", "Vegetarian", "Vegan", "Dairy-Free", "Nut-Free", "Halal", "Kosher"];

const CUSTOM_POLICIES_KEY = "handbook-custom-policies";

interface CustomPolicy {
  id: string;
  label: string;
  desc: string;
  enabled: boolean;
}

function getStoredCustomPolicies(): CustomPolicy[] {
  try {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(CUSTOM_POLICIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCustomPolicies(policies: CustomPolicy[]) {
  localStorage.setItem(CUSTOM_POLICIES_KEY, JSON.stringify(policies));
}

const REQUIRED_FIELDS: (keyof HandbookSettings)[] = [
  "restaurantName", "ownerNames", "restaurantAddress", "restaurantPhone", "restaurantEmail",
  "missionStatement", "conceptCuisine", "generalManager", "posSystem", "operatingHours",
  "uniformDiningRoom", "uniformKitchen", "employeeMealPolicy", "signatureDishesFoh",
  "brandVoice",
];

function getOverallCompleteness(formData: Partial<HandbookSettings>): number {
  const filled = REQUIRED_FIELDS.filter(k => {
    const v = formData[k];
    return v && String(v).trim().length > 0;
  }).length;
  return Math.round((filled / REQUIRED_FIELDS.length) * 100);
}

function getFilledRequiredCount(formData: Partial<HandbookSettings>): number {
  return REQUIRED_FIELDS.filter(k => {
    const v = formData[k];
    return v && String(v).trim().length > 0;
  }).length;
}

function isFieldFilled(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "number") return true;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim().length > 0;
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-5 w-5 shrink-0" style={{ color: "#b8860b" }} />
        <h3 className="font-bold text-white text-[16px]">{title}</h3>
      </div>
      <p className="text-[13px] mb-2" style={{ color: "#64748b" }}>{subtitle}</p>
      <div style={{ height: 1, background: "rgba(184,134,11,0.2)", marginTop: 8 }} />
    </div>
  );
}

function FieldWrapper({ children, filled, label, helper, required }: { children: React.ReactNode; filled: boolean; label?: string; helper?: string; required?: boolean }) {
  return (
    <div
      className="space-y-1"
      style={{ borderLeft: filled ? "2px solid rgba(184,134,11,0.4)" : "2px solid transparent", paddingLeft: 10 }}
    >
      {label && (
        <label className="block text-[11px] uppercase tracking-widest font-medium" style={{ color: "#94a3b8", letterSpacing: "0.08em" }}>
          {label}{required && <span style={{ color: "#b8860b" }}> *</span>}
        </label>
      )}
      {children}
      {helper && <p className="text-[12px] italic" style={{ color: "#64748b" }}>{helper}</p>}
    </div>
  );
}

function ChipInput({ items, onAdd, onRemove, placeholder, addLabel, chipId }: {
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (item: string) => void;
  placeholder: string;
  addLabel?: string;
  chipId: string;
}) {
  const [newItem, setNewItem] = useState("");
  const handleAdd = () => {
    if (newItem.trim() && !items.includes(newItem.trim())) {
      onAdd(newItem.trim());
      setNewItem("");
    }
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 px-3 py-1 text-[13px] text-white"
            style={{
              background: "#1a1d2e",
              border: "1px solid rgba(184,134,11,0.4)",
              borderRadius: 20,
              animation: "chipScaleIn 150ms ease",
            }}
          >
            {item}
            <button
              onClick={() => onRemove(item)}
              className="ml-1 transition-colors"
              style={{ color: "#b8860b" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#b8860b")}
              data-testid={`button-remove-chip-${item.replace(/\s+/g, '-').toLowerCase()}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          placeholder={placeholder}
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
          className="flex-1 h-9 px-3 text-sm text-white rounded-lg"
          style={{
            background: "#0f1117",
            border: "1px solid rgba(255,255,255,0.1)",
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = "1.5px solid #b8860b";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(184,134,11,0.1)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = "none";
            e.currentTarget.style.boxShadow = "none";
          }}
          data-testid={`input-add-${chipId}`}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="border-[rgba(184,134,11,0.4)] text-[#b8860b]"
          style={{ background: "transparent" }}
          data-testid={`button-add-${chipId}`}
        >
          {addLabel || "Add"}
        </Button>
      </div>
    </div>
  );
}

function ToggleChips({ options, selected, onToggle }: {
  options: string[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            onClick={() => onToggle(option)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] transition-all"
            style={{
              background: isSelected ? "rgba(184,134,11,0.12)" : "#1a1d2e",
              border: isSelected ? "1px solid #b8860b" : "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20,
              color: isSelected ? "#fff" : "#64748b",
            }}
            data-testid={`toggle-chip-${option.replace(/\s+/g, '-').toLowerCase()}`}
          >
            {isSelected && <Check className="h-3 w-3" style={{ color: "#b8860b" }} />}
            {option}
          </button>
        );
      })}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#0f1117",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  color: "#fff",
};

const focusClass = "focus-visible:outline-[1.5px] focus-visible:outline-[#b8860b] focus-visible:shadow-[0_0_0_3px_rgba(184,134,11,0.1)]";

export function HandbookBuilder({ user }: { user?: any }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("setup");
  const [showAddCustomPolicy, setShowAddCustomPolicy] = useState(false);
  const [customPolicyLabel, setCustomPolicyLabel] = useState("");
  const [customPolicyDesc, setCustomPolicyDesc] = useState("");
  const [customPolicies, setCustomPolicies] = useState<CustomPolicy[]>(getStoredCustomPolicies);
  const [policyToggles, setPolicyToggles] = useState<Record<string, boolean>>({
    attendance: true,
    discipline: true,
    harassment: true,
    substance: true,
    cellPhone: true,
    cashHandling: true,
    foodSafety: true,
    scheduling: true,
    resignation: true,
    socialMedia: true,
    alcohol: true,
    tipPolicy: true,
  });

  const { data: settings, isLoading } = useQuery<HandbookSettings | null>({
    queryKey: ["/api/handbook-settings"],
  });

  const [formData, setFormData] = useState<Partial<HandbookSettings>>({
    restaurantName: "",
    restaurantAddress: "",
    restaurantPhone: "",
    restaurantEmail: "",
    restaurantWebsite: "",
    ownerNames: "",
    missionStatement: "",
    conceptCuisine: "",
    yearEstablished: "",
    socialMediaHandles: "",
    generalManager: "",
    kitchenManager: "",
    executiveChef: "",
    floorManager: "",
    hrContactEmail: "",
    totalStaff: undefined,
    staffPerDinnerShift: undefined,
    uniformDiningRoom: "Shoes - non-slip, close-toed shoes\nPants - jeans, black, or khaki pants, shorts, or skirt with solid color belt\nShirts - clean restaurant-branded t-shirt\nAppearance - Clean and well-groomed hair, pulled back off shoulder. Well-groomed hands and fingernails.\nAccessories - No excessive cologne, perfume, make-up or jewelry. No earrings longer than 1 inch.",
    uniformKitchen: "Shoes - Black work shoes with non-slip soles, no tennis shoes\nPants - Black pants or jeans, no shorts\nShirts - Black t-shirt or restaurant-branded shirt\nAppearance - Clean, well-groomed hair, hands and fingernails\nHats - A hat or hair net required at all times when working with food",
    employeeMealPolicy: "Employees receive a $5 discount off the regular price of all menu items during each shift. Employee meals can be purchased either before or after your shift or on a scheduled break.",
    parkingPolicy: "Park in employee designated parking areas only.",
    schedulingApp: "homebase",
    posSystem: "",
    posSystemOther: "",
    servicePeriods: [],
    operatingHours: "",
    seatingCapacity: undefined,
    tippingStructure: "",
    breakPolicy: "",
    evaluationSchedule: "January and June",
    orientationDays: 30,
    closedHolidays: defaultHolidays,
    signatureDishesFoh: "",
    signatureDishesBoh: "",
    kitchenStations: defaultStations,
    allergenOptions: [],
    brandVoice: "",
    weeklySpecials: "",
    happyHourDetails: "",
    alcoholPolicy: "",
    socialMediaPolicy: "",
    additionalPolicies: "",
    barManager: "",
    headBartender: "",
    alcoholPermit: "",
    signatureCocktail1: "",
    signatureCocktail2: "",
    signatureCocktail3: "",
    draftBeerCount: undefined,
    closingTime: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData((prev) => ({
        ...prev,
        ...settings,
      }));
    }
  }, [settings]);

  useEffect(() => {
    if (!settings && user) {
      setFormData((prev) => ({
        ...prev,
        restaurantName: prev.restaurantName || user.restaurantName || "",
        restaurantEmail: prev.restaurantEmail || user.email || "",
        restaurantAddress: prev.restaurantAddress || user.address || "",
        restaurantPhone: prev.restaurantPhone || user.phone || "",
        ownerNames: prev.ownerNames || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : ""),
        generalManager: prev.generalManager || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : ""),
        hrContactEmail: prev.hrContactEmail || user.email || "",
      }));
    }
  }, [settings, user]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<HandbookSettings>) => {
      const response = await apiRequest("POST", "/api/handbook-settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/handbook-settings"] });
      toast({
        title: "Settings saved",
        description: "Your handbook settings have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save handbook settings.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const addHoliday = (holiday: string) => {
    if (holiday.trim() && !formData.closedHolidays?.includes(holiday.trim())) {
      setFormData({
        ...formData,
        closedHolidays: [...(formData.closedHolidays || []), holiday.trim()],
      });
    }
  };

  const removeHoliday = (holiday: string) => {
    setFormData({
      ...formData,
      closedHolidays: formData.closedHolidays?.filter(h => h !== holiday) || [],
    });
  };

  const addStation = (station: string) => {
    if (station.trim() && !formData.kitchenStations?.includes(station.trim())) {
      setFormData({
        ...formData,
        kitchenStations: [...(formData.kitchenStations || []), station.trim()],
      });
    }
  };

  const removeStation = (station: string) => {
    setFormData({
      ...formData,
      kitchenStations: formData.kitchenStations?.filter(s => s !== station) || [],
    });
  };

  const toggleServicePeriod = (period: string) => {
    const current = formData.servicePeriods || [];
    setFormData({
      ...formData,
      servicePeriods: current.includes(period) ? current.filter(p => p !== period) : [...current, period],
    });
  };

  const toggleAllergen = (allergen: string) => {
    const current = formData.allergenOptions || [];
    setFormData({
      ...formData,
      allergenOptions: current.includes(allergen) ? current.filter(a => a !== allergen) : [...current, allergen],
    });
  };

  const addCustomPolicy = () => {
    if (!customPolicyLabel.trim()) return;
    const newPolicy: CustomPolicy = {
      id: `custom-${Date.now()}`,
      label: customPolicyLabel.trim(),
      desc: customPolicyDesc.trim(),
      enabled: true,
    };
    const updated = [...customPolicies, newPolicy];
    setCustomPolicies(updated);
    saveCustomPolicies(updated);
    setCustomPolicyLabel("");
    setCustomPolicyDesc("");
    setShowAddCustomPolicy(false);
    toast({ title: "Custom policy added" });
  };

  const toggleCustomPolicy = (id: string) => {
    const updated = customPolicies.map(p =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    setCustomPolicies(updated);
    saveCustomPolicies(updated);
  };

  const removeCustomPolicy = (id: string) => {
    const updated = customPolicies.filter(p => p.id !== id);
    setCustomPolicies(updated);
    saveCustomPolicies(updated);
  };

  const overallCompleteness = useMemo(() => getOverallCompleteness(formData), [formData]);

  const updateField = (key: keyof HandbookSettings, value: any) => {
    setFormData({ ...formData, [key]: value });
  };

  const generateHandbook = (): string => {
    const name = formData.restaurantName || "[Restaurant Name]";
    const address = formData.restaurantAddress || "[Address]";
    const phone = formData.restaurantPhone || "[Phone]";
    const email = formData.restaurantEmail || "[Email]";
    const website = formData.restaurantWebsite || "[Website]";
    const owners = formData.ownerNames || "[Owner Names]";
    const mission = formData.missionStatement || "To consistently provide our customers with exceptional food, beverages, and service by demonstrating warmth, efficiency, knowledge, and professionalism in our work.";
    const orientDays = formData.orientationDays || 30;
    const schedApp = schedulingApps.find(a => a.value === formData.schedulingApp)?.label || "scheduling app";
    const evalSchedule = formData.evaluationSchedule || "twice a year";
    const holidays = formData.closedHolidays?.join(", ") || "Thanksgiving Day, Christmas Day, Easter Sunday";
    const diningUniform = formData.uniformDiningRoom || "";
    const kitchenUniform = formData.uniformKitchen || "";
    const mealPolicy = formData.employeeMealPolicy || "";
    const parkingPolicy = formData.parkingPolicy || "";
    const concept = formData.conceptCuisine ? `, a ${formData.conceptCuisine} restaurant` : "";
    const year = formData.yearEstablished ? ` (Est. ${formData.yearEstablished})` : "";
    const tipping = tippingOptions.find(t => t.value === formData.tippingStructure)?.label || "";
    const breakPol = formData.breakPolicy || "";
    const hours = formData.operatingHours || "";

    return `${name.toUpperCase()}${year}
EMPLOYEE HANDBOOK

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

WELCOME TO OUR TEAM!

We welcome you to ${name}${concept} and look forward to the opportunity to work with you. We want you to know that we recognize our employees as our most valuable asset. Our continued success in providing the highest quality of food, beverages, and service to our customers depends on having quality people like yourself and your fellow employees.

We want you to enjoy your time here and are committed to helping you succeed in your new job. We have prepared this handbook to answer some of the questions that you may have concerning ${name} and its policies. This handbook is intended solely as a guide. Read it thoroughly. If you have questions about anything, contact a manager for assistance.

We hope you find your time with us to be an enjoyable and rewarding experience!

Sincerely,
${owners}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

COMPANY INFORMATION

${name}
${address}
Phone: ${phone}
Email: ${email}
Website: ${website}
${hours ? `\nOperating Hours: ${hours}` : ""}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

MISSION STATEMENT

${mission}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

OUR WAY OF DOING BUSINESS

${name}'s success depends on our people. Our restaurant can only prosper and provide opportunities for employment and growth when we continually improve ourselves and the work that we do.

We believe that a commitment to uncompromising values and integrity should always guide our decisions and actions as we pursue our goals. Following are the core values that form the foundation of our success:

\u2022 We believe in providing all customers with exceptional service
\u2022 We believe in honesty and trust
\u2022 We believe in ongoing training and development of our people
\u2022 We believe our continued success depends on teamwork
\u2022 We believe in doing business in a professional and orderly manner

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

EMPLOYMENT POLICIES

It is the policy of ${name} to hire only United States citizens and aliens who are authorized to work in this country. As required by law, employees will be required to provide original documents that establish this authorization within three days of their date of hire.

NON-DISCRIMINATION

${name} is an equal opportunity employer. We will not tolerate discrimination based on race, sex, age, national origin, religion, sexual orientation, or disability. Employment decisions will be made only for legitimate business reasons based upon qualifications and other nondiscriminatory factors.

AGE REQUIREMENTS

All servers and bartenders must be at least 18 years of age. Employees under the age of 18 must comply with all federal wage and hour guidelines. No employees under 18 years can take orders for or serve alcoholic beverages.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

ORIENTATION PERIOD

You have been through our employee selection process and have been selected for employment. We have a ${orientDays}-day Orientation Period that allows both you and the Company to determine if it's a good fit. During this period you will begin your training and be observed by management.

TRAINING

To help you be successful in your job you will receive adequate training. You will not be expected to be on your own until you are ready. We want you to be a knowledgeable and productive member of our staff.

EVALUATIONS

All employees receive written and verbal performance evaluations ${evalSchedule}. The evaluation process is intended to let you know how well you're performing and help you be more effective and productive.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

SCHEDULES

Schedules are prepared to meet the work demands of the restaurant. Schedules are posted weekly through ${schedApp}. Each employee is responsible for working their shifts.

\u2022 Arrive 10-15 minutes before your shift begins
\u2022 Clock in when your shift begins and be ready to start work immediately
\u2022 Schedule changes may be allowed only if you find a replacement and get manager approval

OVERTIME

In accordance with Federal Minimum Wage Law, employees are paid overtime when they work more than 40 hours in one week at one and one-half times their basic straight time rate.
${breakPol ? `\nBREAK POLICY\n\n${breakPol}` : ""}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

STANDARDS OF CONDUCT

In order to work together as a team and maintain a positive working environment, everyone must conform to standards of reasonable conduct. The following conduct may result in disciplinary action up to and including immediate termination:

1. Invalid Work Authorization (I-9 form)
2. Supplying false or misleading information
3. No call, no show (not showing up without notifying Manager on duty)
4. Clocking another employee in or out
5. Leaving before scheduled time without permission
6. Arrest or conviction of a felony offense
7. Use of foul or abusive language
8. Disorderly or indecent conduct
9. Gambling on restaurant property
10. Theft of customer, employee, or restaurant property
11. Theft, dishonesty, or mishandling of restaurant funds
12. Refusal to follow instructions
13. Harassment of any kind toward another employee or customer
14. Use, distribution, or possession of illegal drugs on restaurant property
15. Waste or destruction of restaurant property
16. Actions or threats of violence
17. Excessive tardiness
18. Disclosing confidential information
19. Rude or improper behavior with customers
20. Smoking or eating in unapproved areas

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

HARASSMENT POLICY

It is this restaurant's policy to treat all personnel with dignity and respect. We strive to provide everyone a workplace that is free of harassment of any kind. Employees are encouraged to promptly report incidents of harassment.

SEXUAL HARASSMENT

All employees have a right to be free from sexual harassment. ${name} does not condone actions, words, jokes, or comments that a reasonable person would regard as sexually harassing or coercive. Anyone who experiences harassment should report it promptly to management.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

ATTENDANCE & ABSENCES

All employees are expected to work on a regular, consistent basis. Excessive absenteeism may result in disciplinary action.

\u2022 Call and talk to a manager at least 2 hours before your scheduled shift if you will be late or absent
\u2022 Any employee who does not call or report to work for two consecutive shifts will be considered to have voluntarily resigned
\u2022 Submit leave requests at least two weeks prior to the scheduled leave date

TARDINESS

Always arrive at the restaurant 10-15 minutes before your shift. Your scheduled time is when you are expected to be on your job, not when you arrive at the restaurant. Repeated tardiness is grounds for termination.

RESIGNATIONS

You are requested to give a two-week notice of your plans to leave. This is a professional courtesy that ensures you are eligible for re-hire.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

TIME CLOCK & PAYROLL

\u2022 Arrive 10-15 minutes before your scheduled start time
\u2022 You may clock in within 5 minutes of the start of your shift
\u2022 Tampering or falsifying time records may result in termination

TIP REPORTING

All tips you receive are taxable income. You are required by federal law to report and record your actual tips for each shift. We strongly encourage you to accurately report your tip income.
${tipping ? `\nTipping Structure: ${tipping}` : ""}

PAYROLL

Paychecks are available every other week. Federal and state withholding taxes are authorized based on your W-4 form.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

HOLIDAYS & VACATIONS

Due to the nature of the restaurant business you may be required to work holidays. The restaurant is closed on: ${holidays}.

VACATIONS

Full-time salaried employees who have been with the restaurant for 12 consecutive months are eligible for one week paid vacation. Vacation requests should be submitted at least one month in advance.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

EMPLOYEE MEALS

${mealPolicy}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

DRESS CODE

DINING ROOM DRESS CODE:
${diningUniform}

KITCHEN DRESS CODE:
${kitchenUniform}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

PARKING

${parkingPolicy}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

SAFETY & SANITATION

${name} is committed to maintaining a safe workplace for all employees. Safety is everyone's responsibility.

Basic Safety Guidelines:
\u2022 Wipe up spills immediately
\u2022 Never run in hallways or kitchen
\u2022 Wear shoes with non-slip soles
\u2022 Report defective equipment to management immediately
\u2022 Never operate equipment without proper training
\u2022 Let people know when carrying anything hot
\u2022 Use proper lifting techniques

SANITATION

We are committed to sanitation and food safety. Follow safe food handling procedures at all times:
\u2022 Keep your hands washed
\u2022 Sanitize everything
\u2022 Prevent cross-contamination
\u2022 Keep food at proper temperatures (below 45\u00b0F or above 140\u00b0F)
\u2022 Store food correctly

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

ALCOHOL SERVICE POLICY

As a restaurant that sells alcoholic beverages, we are committed to responsible alcohol service:

1. We will not serve alcoholic beverages to an intoxicated person
2. We will not knowingly serve a person under the legal drinking age
3. Card anyone who appears to be under 30 years old
4. Offer nonalcoholic alternatives
5. Provide taxi service for intoxicated customers if needed

${formData.alcoholPolicy || ""}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

SOCIAL MEDIA POLICY

Employees may use social media in any way they choose as long as it does not:
\u2022 Impair the work of any employee
\u2022 Harass or demean any employee
\u2022 Disrupt the flow of work
\u2022 Disclose confidential or proprietary information
\u2022 Harm the goodwill and reputation of ${name}

${formData.socialMediaPolicy || ""}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

CUSTOMER SERVICE

Our restaurant exists only because of customers. Taking care of our customers is our highest priority. At ${name}, the customer always comes first!

HANDLING COMPLAINTS
\u2022 Don't get defensive
\u2022 Remove the offending item immediately
\u2022 Apologize and tell the customer you will take care of the problem
\u2022 Don't hesitate to ask a manager for assistance

TELEPHONE COURTESY
\u2022 Answer the phone promptly, within two rings
\u2022 Always answer in a friendly, polite manner
\u2022 Thank the person for calling

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

TEAMWORK

We cannot achieve our goals without working together as a team. If a co-worker is overloaded and you're not, help them. Pitch in to help a customer whether they are technically yours or not. Genuine teamwork makes for a much more enjoyable work experience.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

EMERGENCY PROCEDURES

ACCIDENTS
Report all accidents, no matter how minor, to the manager on duty.

ROBBERY
DO NOT RESIST. Your safety is our highest priority. Always cooperate fully.

FIRE
Know the location of fire extinguishers. If the fire alarm sounds, assist guests to the nearest exit immediately.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

${formData.additionalPolicies ? `ADDITIONAL POLICIES

${formData.additionalPolicies}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

` : ""}ACKNOWLEDGMENT

I acknowledge receipt of, and have read, the Employee Handbook that outlines my benefits and obligations as an employee of ${name}. I understand the Standards of Conduct and each of the rules and regulations which I am expected to follow. I agree to abide by all of them.

This handbook is a general guide and does not constitute an employment agreement or guarantee of continued employment. Employment is at-will and can be terminated at any time by either party.


Employee Name: ________________________________

Employee Signature: ________________________________

Date: ________________________________

Manager Signature: ________________________________

Date: ________________________________
`;
  };

  const escapeHtml = (str: string): string => {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return str.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
  };

  const handlePrint = () => {
    const content = generateHandbook();
    const escapedContent = escapeHtml(content);
    const escapedTitle = escapeHtml(formData.restaurantName || "Restaurant");
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${escapedTitle} Employee Handbook</title>
          <style>
            @page {
              size: letter;
              margin: 0.75in 1in;
            }
            * {
              box-sizing: border-box;
            }
            body { 
              font-family: 'Georgia', 'Times New Roman', serif; 
              font-size: 11pt;
              line-height: 1.5;
              color: #000;
              margin: 0;
              padding: 0;
            }
            .handbook-content {
              white-space: pre-wrap;
              word-wrap: break-word;
              font-family: 'Georgia', 'Times New Roman', serif;
              font-size: 11pt;
              line-height: 1.5;
            }
            h1, h2, h3 {
              font-family: 'Georgia', 'Times New Roman', serif;
              margin-top: 1.5em;
              margin-bottom: 0.5em;
            }
            @media screen {
              body {
                max-width: 8.5in;
                margin: 0 auto;
                padding: 40px 60px;
                background: #fff;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
              }
              .print-only { display: none; }
            }
            @media print {
              body { 
                padding: 0;
                background: none;
                box-shadow: none;
              }
              .screen-only { display: none; }
              .handbook-content {
                orphans: 3;
                widows: 3;
              }
              .page-break {
                page-break-before: always;
              }
              .no-break {
                page-break-inside: avoid;
              }
            }
            .print-header {
              text-align: center;
              margin-bottom: 2em;
              padding-bottom: 1em;
              border-bottom: 2px solid #333;
            }
            .print-header h1 {
              font-size: 24pt;
              margin: 0 0 0.25em 0;
            }
            .print-header p {
              font-size: 14pt;
              margin: 0;
              color: #555;
            }
            .print-button {
              position: fixed;
              top: 20px;
              right: 20px;
              background: #2563eb;
              color: white;
              border: none;
              padding: 12px 24px;
              font-size: 14pt;
              border-radius: 6px;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }
            .print-button:hover {
              background: #1d4ed8;
            }
          </style>
        </head>
        <body>
          <button class="print-button screen-only" onclick="window.print()">Print Handbook</button>
          <div class="print-header">
            <h1>${escapedTitle}</h1>
            <p>Employee Handbook</p>
          </div>
          <pre class="handbook-content">${escapedContent}</pre>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownloadPdf = () => {
    handlePrint();
  };

  const handleCopyAll = () => {
    const content = generateHandbook();
    navigator.clipboard.writeText(content).then(() => {
      toast({ title: "Copied to clipboard", description: "Handbook content has been copied." });
    }).catch(() => {
      toast({ title: "Copy failed", description: "Unable to copy content.", variant: "destructive" });
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-md p-8 flex items-center justify-center" style={{ background: "#0f1117", minHeight: 256 }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#b8860b" }} />
      </div>
    );
  }

  const tabs = [
    { id: "setup", label: "Setup", icon: Settings },
    { id: "policies", label: "Policies", icon: Shield },
    { id: "preview", label: "Preview", icon: FileText },
  ];

  const enabledStandardCount = Object.values(policyToggles).filter(Boolean).length;
  const enabledCustomCount = customPolicies.filter(p => p.enabled).length;

  return (
    <div className="space-y-0">
      <div className="rounded-md p-5" style={{ background: "#1a1d2e" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="flex flex-wrap items-center gap-2 text-lg font-bold text-white">
              <BookOpen className="h-5 w-5" style={{ color: "#b8860b" }} />
              Employee Handbook Builder
            </h3>
            <p className="text-sm mt-1" style={{ color: "#64748b" }}>
              Create a customized employee handbook for your restaurant
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="transition-colors"
              style={{
                background: "#1a1d2e",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
              }}
              data-testid="button-print-handbook"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white transition-all"
              style={{
                background: saveMutation.isPending ? "#b8860b" : "linear-gradient(135deg, #b8860b, #d4a017)",
                backgroundImage: saveMutation.isPending ? undefined : "linear-gradient(135deg, #b8860b 0%, #d4a017 100%)",
                opacity: saveMutation.isPending ? 0.7 : 1,
                cursor: saveMutation.isPending ? "not-allowed" : "pointer",
              }}
              data-testid="button-save-handbook"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>

        <div className="flex gap-1 mb-5" data-testid="handbook-tab-bar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "text-white"
                    : "text-gray-400"
                }`}
                style={{
                  background: isActive ? "#0f1117" : "transparent",
                  borderBottom: isActive ? "2px solid #b8860b" : "2px solid transparent",
                }}
                data-testid={`tab-handbook-${tab.id}`}
              >
                <TabIcon className="h-4 w-4" style={isActive ? { color: "#b8860b" } : {}} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "setup" && (
          <div className="space-y-8" style={{ animation: "scheduleStaggerIn 0.3s ease-out" }}>

            <div className="rounded-md p-3" style={{ background: "#0f1117" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px]" style={{ color: "#64748b" }}>Setup Completion</span>
                <span className="text-[12px] font-medium" style={{ color: overallCompleteness === 100 ? "#b8860b" : "#94a3b8" }}>
                  {overallCompleteness === 100 ? "Setup Complete — Ready to Generate" : `${overallCompleteness}% complete`}
                </span>
              </div>
              <div className="w-full rounded-full" style={{ height: 6, background: "#1a1d2e" }}>
                <div
                  className="rounded-full transition-all duration-500"
                  style={{
                    height: 6,
                    width: `${overallCompleteness}%`,
                    background: overallCompleteness === 100 ? "#b8860b" : "linear-gradient(90deg, #b8860b, #d4a017)",
                  }}
                />
              </div>
              <p className="text-[12px] mt-1.5" style={{ color: "#64748b" }}>
                {overallCompleteness < 100
                  ? "Complete your setup to unlock personalized training documents."
                  : "All required fields are complete."}
              </p>
            </div>

            <div className="rounded-md p-5" style={{ background: "#0f1117" }}>
              <SectionHeader icon={Building2} title="Restaurant Information" subtitle="Basic details about your restaurant" />
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FieldWrapper filled={isFieldFilled(formData.restaurantName)} label="Restaurant Name" required>
                    <Input
                      placeholder="e.g., The Golden Fork"
                      value={formData.restaurantName || ""}
                      onChange={(e) => updateField("restaurantName", e.target.value)}
                      className={focusClass}
                      style={inputStyle}
                      data-testid="input-restaurant-name"
                    />
                  </FieldWrapper>
                  <FieldWrapper filled={isFieldFilled(formData.ownerNames)} label="Owner Name(s)" required>
                    <Input
                      placeholder="e.g., John and Jane Smith"
                      value={formData.ownerNames || ""}
                      onChange={(e) => updateField("ownerNames", e.target.value)}
                      className={focusClass}
                      style={inputStyle}
                      data-testid="input-owner-names"
                    />
                  </FieldWrapper>
                </div>

                <FieldWrapper filled={isFieldFilled(formData.restaurantAddress)} label="Address" required>
                  <Input
                    placeholder="e.g., 123 Main Street, Austin, TX 78701"
                    value={formData.restaurantAddress || ""}
                    onChange={(e) => updateField("restaurantAddress", e.target.value)}
                    className={focusClass}
                    style={inputStyle}
                    data-testid="input-restaurant-address"
                  />
                </FieldWrapper>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <FieldWrapper filled={isFieldFilled(formData.restaurantPhone)} label="Phone" required>
                    <Input
                      placeholder="(512) 555-1234"
                      value={formData.restaurantPhone || ""}
                      onChange={(e) => updateField("restaurantPhone", e.target.value)}
                      className={focusClass}
                      style={inputStyle}
                      data-testid="input-restaurant-phone"
                    />
                  </FieldWrapper>
                  <FieldWrapper filled={isFieldFilled(formData.restaurantEmail)} label="Email" required>
                    <Input
                      placeholder="manager@restaurant.com"
                      value={formData.restaurantEmail || ""}
                      onChange={(e) => updateField("restaurantEmail", e.target.value)}
                      className={focusClass}
                      style={inputStyle}
                      data-testid="input-restaurant-email"
                    />
                  </FieldWrapper>
                  <FieldWrapper filled={isFieldFilled(formData.restaurantWebsite)} label="Website">
                    <Input
                      placeholder="www.restaurant.com"
                      value={formData.restaurantWebsite || ""}
                      onChange={(e) => updateField("restaurantWebsite", e.target.value)}
                      className={focusClass}
                      style={inputStyle}
                      data-testid="input-restaurant-website"
                    />
                  </FieldWrapper>
                </div>

                <FieldWrapper filled={isFieldFilled(formData.missionStatement)} label="Mission Statement" required>
                  <Textarea
                    placeholder="Your restaurant's mission and values..."
                    value={formData.missionStatement || ""}
                    onChange={(e) => updateField("missionStatement", e.target.value)}
                    className={`min-h-[100px] ${focusClass}`}
                    style={inputStyle}
                    data-testid="textarea-mission-statement"
                  />
                </FieldWrapper>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <div className="md:col-span-2">
                    <FieldWrapper filled={isFieldFilled(formData.conceptCuisine)} label="Concept & Cuisine Type" required helper="Describes your concept in 2-5 words. Used throughout your training documents.">
                      <Input
                        placeholder="e.g., Southern Cajun Bistro, Fast-Casual Mexican, Fine Dining Italian"
                        value={formData.conceptCuisine || ""}
                        onChange={(e) => updateField("conceptCuisine", e.target.value)}
                        className={focusClass}
                        style={inputStyle}
                        data-testid="input-concept-cuisine"
                      />
                    </FieldWrapper>
                  </div>
                  <FieldWrapper filled={isFieldFilled(formData.yearEstablished)} label="Year Established">
                    <Input
                      placeholder="e.g., 2019"
                      value={formData.yearEstablished || ""}
                      onChange={(e) => updateField("yearEstablished", e.target.value)}
                      className={focusClass}
                      style={inputStyle}
                      data-testid="input-year-established"
                    />
                  </FieldWrapper>
                  <FieldWrapper filled={isFieldFilled(formData.socialMediaHandles)} label="Social Media (optional)" helper="Used in the Social Media Policy section of your handbook.">
                    <Input
                      placeholder="@moutonsbistrobar"
                      value={formData.socialMediaHandles || ""}
                      onChange={(e) => updateField("socialMediaHandles", e.target.value)}
                      className={focusClass}
                      style={inputStyle}
                      data-testid="input-social-media-handles"
                    />
                  </FieldWrapper>
                </div>
              </div>
            </div>

            <div className="rounded-md p-5" style={{ background: "#0f1117" }}>
              <SectionHeader icon={Users} title="Your Team" subtitle="Key names used in your training manuals and handbook." />
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FieldWrapper filled={isFieldFilled(formData.generalManager)} label="General Manager / Owner" required>
                    <Input
                      placeholder="e.g., Ben Mouton"
                      value={formData.generalManager || ""}
                      onChange={(e) => updateField("generalManager", e.target.value)}
                      className={focusClass}
                      style={inputStyle}
                      data-testid="input-general-manager"
                    />
                  </FieldWrapper>
                  <FieldWrapper filled={isFieldFilled(formData.kitchenManager)} label="Kitchen Manager">
                    <Input
                      placeholder="e.g., Chef Marcus"
                      value={formData.kitchenManager || ""}
                      onChange={(e) => updateField("kitchenManager", e.target.value)}
                      className={focusClass}
                      style={inputStyle}
                      data-testid="input-kitchen-manager"
                    />
                  </FieldWrapper>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FieldWrapper filled={isFieldFilled(formData.executiveChef)} label="Executive Chef">
                    <Input
                      placeholder="e.g., Chef Daniel"
                      value={formData.executiveChef || ""}
                      onChange={(e) => updateField("executiveChef", e.target.value)}
                      className={focusClass}
                      style={inputStyle}
                      data-testid="input-executive-chef"
                    />
                  </FieldWrapper>
                  <FieldWrapper filled={isFieldFilled(formData.floorManager)} label="Floor Manager / Shift Lead">
                    <Input
                      placeholder="e.g., Sarah"
                      value={formData.floorManager || ""}
                      onChange={(e) => updateField("floorManager", e.target.value)}
                      className={focusClass}
                      style={inputStyle}
                      data-testid="input-floor-manager"
                    />
                  </FieldWrapper>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <FieldWrapper filled={isFieldFilled(formData.hrContactEmail)} label="HR / Support Contact Email">
                    <Input
                      placeholder="e.g., hr@moutonsbistro.com"
                      value={formData.hrContactEmail || ""}
                      onChange={(e) => updateField("hrContactEmail", e.target.value)}
                      className={focusClass}
                      style={inputStyle}
                      data-testid="input-hr-contact-email"
                    />
                  </FieldWrapper>
                  <FieldWrapper filled={isFieldFilled(formData.totalStaff)} label="Total Staff (approx.)">
                    <Input
                      type="number"
                      placeholder="e.g., 24"
                      value={formData.totalStaff ?? ""}
                      onChange={(e) => updateField("totalStaff", e.target.value ? parseInt(e.target.value) : undefined)}
                      className={focusClass}
                      style={inputStyle}
                      data-testid="input-total-staff"
                    />
                  </FieldWrapper>
                  <FieldWrapper filled={isFieldFilled(formData.staffPerDinnerShift)} label="Staff Per Dinner Shift" helper="Used in kitchen training materials.">
                    <Input
                      type="number"
                      placeholder="e.g., 5"
                      value={formData.staffPerDinnerShift ?? ""}
                      onChange={(e) => updateField("staffPerDinnerShift", e.target.value ? parseInt(e.target.value) : undefined)}
                      className={focusClass}
                      style={inputStyle}
                      data-testid="input-staff-per-dinner-shift"
                    />
                  </FieldWrapper>
                </div>
              </div>
            </div>

            <div className="rounded-md p-5" style={{ background: "#0f1117" }}>
              <SectionHeader icon={Clock} title="Operations" subtitle="Scheduling, service periods, and operational details." />
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <FieldWrapper filled={isFieldFilled(formData.schedulingApp)} label="Scheduling App">
                    <Select
                      value={formData.schedulingApp || ""}
                      onValueChange={(value) => updateField("schedulingApp", value)}
                    >
                      <SelectTrigger
                        className={focusClass}
                        style={inputStyle}
                        data-testid="select-scheduling-app"
                      >
                        <SelectValue placeholder="Select app" />
                      </SelectTrigger>
                      <SelectContent style={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.1)" }}>
                        {schedulingApps.map((app) => (
                          <SelectItem key={app.value} value={app.value}>{app.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldWrapper>
                  <FieldWrapper filled={isFieldFilled(formData.orientationDays)} label="Orientation Period (days)">
                    <Input
                      type="number"
                      min={1}
                      max={90}
                      value={formData.orientationDays || 30}
                      onChange={(e) => updateField("orientationDays", parseInt(e.target.value) || 30)}
                      className={focusClass}
                      style={inputStyle}
                      data-testid="input-orientation-days"
                    />
                  </FieldWrapper>
                  <FieldWrapper filled={isFieldFilled(formData.evaluationSchedule)} label="Evaluation Schedule">
                    <Input
                      placeholder="e.g., January and June"
                      value={formData.evaluationSchedule || ""}
                      onChange={(e) => updateField("evaluationSchedule", e.target.value)}
                      className={focusClass}
                      style={inputStyle}
                      data-testid="input-evaluation-schedule"
                    />
                  </FieldWrapper>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FieldWrapper filled={isFieldFilled(formData.posSystem)} label="POS System" required helper="Referenced in server training for POS-specific procedures.">
                    <Select
                      value={formData.posSystem || ""}
                      onValueChange={(value) => updateField("posSystem", value)}
                    >
                      <SelectTrigger
                        className={focusClass}
                        style={inputStyle}
                        data-testid="select-pos-system"
                      >
                        <SelectValue placeholder="Select POS system" />
                      </SelectTrigger>
                      <SelectContent style={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.1)" }}>
                        {posSystems.map((pos) => (
                          <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.posSystem === "other" && (
                      <Input
                        placeholder="Specify POS system..."
                        value={formData.posSystemOther || ""}
                        onChange={(e) => updateField("posSystemOther", e.target.value)}
                        className={`mt-2 ${focusClass}`}
                        style={inputStyle}
                        data-testid="input-pos-system-other"
                      />
                    )}
                  </FieldWrapper>
                  <FieldWrapper filled={isFieldFilled(formData.tippingStructure)} label="Tipping Structure">
                    <Select
                      value={formData.tippingStructure || ""}
                      onValueChange={(value) => updateField("tippingStructure", value)}
                    >
                      <SelectTrigger
                        className={focusClass}
                        style={inputStyle}
                        data-testid="select-tipping-structure"
                      >
                        <SelectValue placeholder="Select tipping structure" />
                      </SelectTrigger>
                      <SelectContent style={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.1)" }}>
                        {tippingOptions.map((tip) => (
                          <SelectItem key={tip.value} value={tip.value}>{tip.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldWrapper>
                </div>

                <FieldWrapper filled={isFieldFilled(formData.servicePeriods)} label="Service Periods">
                  <ToggleChips
                    options={servicePeriodOptions}
                    selected={formData.servicePeriods || []}
                    onToggle={toggleServicePeriod}
                  />
                </FieldWrapper>

                <FieldWrapper filled={isFieldFilled(formData.operatingHours)} label="Operating Hours" required>
                  <Input
                    placeholder="e.g., Tue-Thu 11am-10pm, Fri-Sat 11am-11pm, Sun 10am-9pm, Closed Mon"
                    value={formData.operatingHours || ""}
                    onChange={(e) => updateField("operatingHours", e.target.value)}
                    className={focusClass}
                    style={inputStyle}
                    data-testid="input-operating-hours"
                  />
                </FieldWrapper>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FieldWrapper filled={isFieldFilled(formData.seatingCapacity)} label="Seating Capacity">
                    <Input
                      type="number"
                      placeholder="e.g., 85"
                      value={formData.seatingCapacity ?? ""}
                      onChange={(e) => updateField("seatingCapacity", e.target.value ? parseInt(e.target.value) : undefined)}
                      className={focusClass}
                      style={inputStyle}
                      data-testid="input-seating-capacity"
                    />
                  </FieldWrapper>
                  <FieldWrapper filled={isFieldFilled(formData.breakPolicy)} label="Break Policy">
                    <Input
                      placeholder="e.g., 30-min unpaid break for shifts over 6 hours"
                      value={formData.breakPolicy || ""}
                      onChange={(e) => updateField("breakPolicy", e.target.value)}
                      className={focusClass}
                      style={inputStyle}
                      data-testid="input-break-policy"
                    />
                  </FieldWrapper>
                </div>

                <FieldWrapper filled={(formData.closedHolidays || []).length > 0} label="Closed Holidays">
                  <ChipInput
                    items={formData.closedHolidays || []}
                    onAdd={addHoliday}
                    onRemove={removeHoliday}
                    placeholder="Add a holiday..."
                    addLabel="Add"
                    chipId="holiday"
                  />
                </FieldWrapper>
              </div>
            </div>

            <div className="rounded-md p-5" style={{ background: "#0f1117" }}>
              <SectionHeader icon={ChefHat} title="Menu & Kitchen" subtitle="Used to personalize kitchen and server training content." />
              <div className="space-y-5">
                <FieldWrapper filled={isFieldFilled(formData.signatureDishesFoh)} label="Signature / Featured Dishes (FOH)" required helper="Server training Day 2 references your actual menu items.">
                  <Textarea
                    placeholder="e.g., Shrimp & Grits (Cajun sauce), Chicken Fried Steak (white gravy), Gumbo Fridays special"
                    value={formData.signatureDishesFoh || ""}
                    onChange={(e) => updateField("signatureDishesFoh", e.target.value)}
                    className={`min-h-[80px] ${focusClass}`}
                    style={inputStyle}
                    data-testid="textarea-signature-dishes-foh"
                  />
                </FieldWrapper>

                <FieldWrapper filled={isFieldFilled(formData.signatureDishesBoh)} label="Signature / Featured Dishes (BOH)" helper="Kitchen training Day 2 (Prep) and Day 3 (Stations) reference these.">
                  <Textarea
                    placeholder="e.g., Grillades & Grits, Maque Choux, Jambalaya Pasta"
                    value={formData.signatureDishesBoh || ""}
                    onChange={(e) => updateField("signatureDishesBoh", e.target.value)}
                    className={`min-h-[80px] ${focusClass}`}
                    style={inputStyle}
                    data-testid="textarea-signature-dishes-boh"
                  />
                </FieldWrapper>

                <FieldWrapper filled={(formData.kitchenStations || []).length > 0} label="Kitchen Stations" helper="Kitchen training materials reference your specific stations.">
                  <ChipInput
                    items={formData.kitchenStations || []}
                    onAdd={addStation}
                    onRemove={removeStation}
                    placeholder="Add a station..."
                    addLabel="Add"
                    chipId="station"
                  />
                </FieldWrapper>

                <FieldWrapper filled={(formData.allergenOptions || []).length > 0} label="Dietary Options Available">
                  <ToggleChips
                    options={allergenOptionsList}
                    selected={formData.allergenOptions || []}
                    onToggle={toggleAllergen}
                  />
                </FieldWrapper>

                <FieldWrapper filled={isFieldFilled(formData.brandVoice)} label="Brand Voice / Cultural Identity" required helper="Used in training manual welcome language and service standards tone.">
                  <Input
                    placeholder="e.g., Southern hospitality, Fast and Flavorful, Louisiana roots"
                    value={formData.brandVoice || ""}
                    onChange={(e) => updateField("brandVoice", e.target.value)}
                    className={focusClass}
                    style={inputStyle}
                    data-testid="input-brand-voice"
                  />
                </FieldWrapper>
              </div>
            </div>

            <div className="rounded-md p-5" style={{ background: "#0f1117" }}>
              <SectionHeader icon={Star} title="Events & Specials" subtitle="Used in training materials for event prep days." />
              <div className="space-y-5">
                <FieldWrapper filled={isFieldFilled(formData.weeklySpecials)} label="Weekly Specials / Recurring Events" helper="Server Day 2 and Kitchen Day 5 reference your specific events.">
                  <Textarea
                    placeholder="e.g., Gumbo Fridays, Crawfish Boil Thursdays, Happy Hour Tue-Fri 3-6pm"
                    value={formData.weeklySpecials || ""}
                    onChange={(e) => updateField("weeklySpecials", e.target.value)}
                    className={`min-h-[80px] ${focusClass}`}
                    style={inputStyle}
                    data-testid="textarea-weekly-specials"
                  />
                </FieldWrapper>

                <FieldWrapper filled={isFieldFilled(formData.happyHourDetails)} label="Happy Hour (if applicable)" helper="Used in Server Day 5 (Happy Hour POS codes) and Kitchen Day 5 (batch appetizers).">
                  <Input
                    placeholder="e.g., Tue-Fri 3-6pm, $2 off drinks, half-price appetizers"
                    value={formData.happyHourDetails || ""}
                    onChange={(e) => updateField("happyHourDetails", e.target.value)}
                    className={focusClass}
                    style={inputStyle}
                    data-testid="input-happy-hour-details"
                  />
                </FieldWrapper>
              </div>
            </div>

            <div className="rounded-md p-5" style={{ background: "#0f1117" }}>
              <SectionHeader icon={Wine} title="Bar Program" subtitle="Used in the Bartender Training Manual for bar operations, cocktails, and compliance." />
              <div className="space-y-5">
                <FieldWrapper filled={isFieldFilled(formData.barManager)} label="Bar Manager / GM Name" helper="Referenced in Bartender Day 1 orientation and chain of command.">
                  <Input
                    placeholder="e.g., Sarah Mitchell"
                    value={formData.barManager || ""}
                    onChange={(e) => updateField("barManager", e.target.value)}
                    className={focusClass}
                    style={inputStyle}
                    data-testid="input-bar-manager"
                  />
                </FieldWrapper>

                <FieldWrapper filled={isFieldFilled(formData.headBartender)} label="Head Bartender" helper="Lead trainer for bartender onboarding and Day 7 certification.">
                  <Input
                    placeholder="e.g., Jake Rivera"
                    value={formData.headBartender || ""}
                    onChange={(e) => updateField("headBartender", e.target.value)}
                    className={focusClass}
                    style={inputStyle}
                    data-testid="input-head-bartender"
                  />
                </FieldWrapper>

                <FieldWrapper filled={isFieldFilled(formData.alcoholPermit)} label="Alcohol License / Permit Type" helper="Displayed on Bartender Day 1 TABC compliance section.">
                  <Select value={formData.alcoholPermit || ""} onValueChange={(val) => updateField("alcoholPermit", val)}>
                    <SelectTrigger className={focusClass} style={inputStyle} data-testid="select-alcohol-permit">
                      <SelectValue placeholder="Select permit type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tabc_mixed">TABC Mixed Beverage Permit</SelectItem>
                      <SelectItem value="beer_wine">Beer & Wine Only</SelectItem>
                      <SelectItem value="full_liquor">Full Liquor License</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldWrapper>

                <FieldWrapper filled={isFieldFilled(formData.signatureCocktail1)} label="Signature Cocktail #1" helper="Featured in Bartender Day 3 and assessment questions.">
                  <Input
                    placeholder="e.g., Smoky Old Fashioned"
                    value={formData.signatureCocktail1 || ""}
                    onChange={(e) => updateField("signatureCocktail1", e.target.value)}
                    className={focusClass}
                    style={inputStyle}
                    data-testid="input-signature-cocktail-1"
                  />
                </FieldWrapper>

                <FieldWrapper filled={isFieldFilled(formData.signatureCocktail2)} label="Signature Cocktail #2">
                  <Input
                    placeholder="e.g., House Margarita"
                    value={formData.signatureCocktail2 || ""}
                    onChange={(e) => updateField("signatureCocktail2", e.target.value)}
                    className={focusClass}
                    style={inputStyle}
                    data-testid="input-signature-cocktail-2"
                  />
                </FieldWrapper>

                <FieldWrapper filled={isFieldFilled(formData.signatureCocktail3)} label="Signature Cocktail #3">
                  <Input
                    placeholder="e.g., Bourbon Peach Smash"
                    value={formData.signatureCocktail3 || ""}
                    onChange={(e) => updateField("signatureCocktail3", e.target.value)}
                    className={focusClass}
                    style={inputStyle}
                    data-testid="input-signature-cocktail-3"
                  />
                </FieldWrapper>

                <FieldWrapper filled={isFieldFilled(formData.draftBeerCount)} label="Number of Draft Lines" helper="Used in Bartender Day 2 beer knowledge section.">
                  <Input
                    type="number"
                    placeholder="e.g., 12"
                    value={formData.draftBeerCount ?? ""}
                    onChange={(e) => updateField("draftBeerCount", e.target.value ? parseInt(e.target.value) : undefined)}
                    className={focusClass}
                    style={inputStyle}
                    data-testid="input-draft-beer-count"
                  />
                </FieldWrapper>

                <FieldWrapper filled={isFieldFilled(formData.closingTime)} label="Bar Closing Time" helper="Used in Bartender Day 6 close checklist and last call timing.">
                  <Input
                    placeholder="e.g., 12:00 AM, 2:00 AM"
                    value={formData.closingTime || ""}
                    onChange={(e) => updateField("closingTime", e.target.value)}
                    className={focusClass}
                    style={inputStyle}
                    data-testid="input-closing-time"
                  />
                </FieldWrapper>
              </div>
            </div>

            <div className="rounded-md p-5" style={{ background: "#0f1117" }}>
              <SectionHeader icon={Shirt} title="Uniform Policy" subtitle="Dress code requirements for front and back of house." />
              <div className="space-y-5">
                <FieldWrapper filled={isFieldFilled(formData.uniformDiningRoom)} label="Dining Room Dress Code" required>
                  <Textarea
                    placeholder="Describe the uniform requirements for dining room staff..."
                    value={formData.uniformDiningRoom || ""}
                    onChange={(e) => updateField("uniformDiningRoom", e.target.value)}
                    className={`min-h-[120px] font-mono text-sm ${focusClass}`}
                    style={inputStyle}
                    data-testid="textarea-uniform-dining"
                  />
                </FieldWrapper>

                <FieldWrapper filled={isFieldFilled(formData.uniformKitchen)} label="Kitchen Dress Code" required>
                  <Textarea
                    placeholder="Describe the uniform requirements for kitchen staff..."
                    value={formData.uniformKitchen || ""}
                    onChange={(e) => updateField("uniformKitchen", e.target.value)}
                    className={`min-h-[120px] font-mono text-sm ${focusClass}`}
                    style={inputStyle}
                    data-testid="textarea-uniform-kitchen"
                  />
                </FieldWrapper>
              </div>
            </div>

            <div className="rounded-md p-5" style={{ background: "#0f1117" }}>
              <SectionHeader icon={Heart} title="Employee Benefits" subtitle="Meal policies, parking, and other employee benefits." />
              <div className="space-y-5">
                <FieldWrapper filled={isFieldFilled(formData.employeeMealPolicy)} label="Employee Meal Policy" required>
                  <Textarea
                    placeholder="Describe your employee meal discount or policy..."
                    value={formData.employeeMealPolicy || ""}
                    onChange={(e) => updateField("employeeMealPolicy", e.target.value)}
                    className={`min-h-[80px] ${focusClass}`}
                    style={inputStyle}
                    data-testid="textarea-meal-policy"
                  />
                </FieldWrapper>

                <FieldWrapper filled={isFieldFilled(formData.parkingPolicy)} label="Parking Policy">
                  <Input
                    placeholder="e.g., Park in employee designated areas only"
                    value={formData.parkingPolicy || ""}
                    onChange={(e) => updateField("parkingPolicy", e.target.value)}
                    className={focusClass}
                    style={inputStyle}
                    data-testid="input-parking-policy"
                  />
                </FieldWrapper>
              </div>
            </div>
          </div>
        )}

        {activeTab === "policies" && (
          <div className="space-y-5" style={{ animation: "scheduleStaggerIn 0.3s ease-out" }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-white flex flex-wrap items-center gap-2">
                <Shield className="h-4 w-4" style={{ color: "#b8860b" }} />
                Standard Policies
              </h3>
              <Badge variant="secondary" data-testid="badge-policy-count">
                {enabledStandardCount + enabledCustomCount} of {STANDARD_POLICIES.length + customPolicies.length} included
              </Badge>
            </div>
            <p className="text-sm" style={{ color: "#64748b" }}>
              Toggle policies on or off to include them in your handbook. Add custom notes where needed.
            </p>

            <div className="space-y-3">
              {STANDARD_POLICIES.map((policy) => {
                const isOn = policyToggles[policy.key] ?? true;
                return (
                  <div
                    key={policy.key}
                    className="rounded-md p-3 space-y-2 transition-colors"
                    style={{
                      background: "#0f1117",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    data-testid={`policy-section-${policy.key}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        className="shrink-0 mt-0.5 rounded-md flex items-center justify-center transition-colors"
                        style={{
                          width: 28,
                          height: 28,
                          background: isOn ? "#b8860b" : "transparent",
                          border: isOn ? "none" : "1px solid rgba(255,255,255,0.15)",
                          color: isOn ? "#0f1117" : "#64748b",
                        }}
                        onClick={() =>
                          setPolicyToggles((prev) => ({
                            ...prev,
                            [policy.key]: !prev[policy.key],
                          }))
                        }
                        data-testid={`toggle-policy-${policy.key}`}
                      >
                        {isOn ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-white">{policy.label}</div>
                        <div className="text-xs" style={{ color: "#64748b" }}>{policy.desc}</div>
                      </div>
                    </div>

                    {isOn && policy.key === "alcohol" && (
                      <div className="pl-10 space-y-1">
                        <Label htmlFor="alcoholPolicy" className="text-xs" style={{ color: "#64748b" }}>
                          Custom notes (optional)
                        </Label>
                        <Textarea
                          id="alcoholPolicy"
                          placeholder="Any additional alcohol service policies specific to your restaurant..."
                          value={formData.alcoholPolicy || ""}
                          onChange={(e) => updateField("alcoholPolicy", e.target.value)}
                          className={`min-h-[80px] text-sm ${focusClass}`}
                          style={inputStyle}
                          data-testid="textarea-alcohol-policy"
                        />
                      </div>
                    )}

                    {isOn && policy.key === "socialMedia" && (
                      <div className="pl-10 space-y-1">
                        <Label htmlFor="socialMediaPolicy" className="text-xs" style={{ color: "#64748b" }}>
                          Custom notes (optional)
                        </Label>
                        <Textarea
                          id="socialMediaPolicy"
                          placeholder="Any additional social media guidelines specific to your restaurant..."
                          value={formData.socialMediaPolicy || ""}
                          onChange={(e) => updateField("socialMediaPolicy", e.target.value)}
                          className={`min-h-[80px] text-sm ${focusClass}`}
                          style={inputStyle}
                          data-testid="textarea-social-media-policy"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {customPolicies.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Plus className="h-3 w-3" style={{ color: "#b8860b" }} />
                  Custom Policies
                </h4>
                {customPolicies.map((policy) => (
                  <div
                    key={policy.id}
                    className="rounded-md p-3 space-y-2 transition-colors"
                    style={{
                      background: "#0f1117",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    data-testid={`policy-section-${policy.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        className="shrink-0 mt-0.5 rounded-md flex items-center justify-center transition-colors"
                        style={{
                          width: 28,
                          height: 28,
                          background: policy.enabled ? "#b8860b" : "transparent",
                          border: policy.enabled ? "none" : "1px solid rgba(255,255,255,0.15)",
                          color: policy.enabled ? "#0f1117" : "#64748b",
                        }}
                        onClick={() => toggleCustomPolicy(policy.id)}
                        data-testid={`toggle-custom-policy-${policy.id}`}
                      >
                        {policy.enabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-white">{policy.label}</div>
                        {policy.desc && (
                          <div className="text-xs" style={{ color: "#64748b" }}>{policy.desc}</div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCustomPolicy(policy.id)}
                        data-testid={`button-remove-custom-policy-${policy.id}`}
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2">
              {showAddCustomPolicy ? (
                <div
                  className="rounded-md p-4 space-y-3"
                  style={{ background: "#0f1117", border: "1px solid #b8860b" }}
                >
                  <h4 className="text-sm font-semibold text-white">Add Custom Policy</h4>
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-300">Policy Name</Label>
                    <Input
                      placeholder="e.g., Technology Usage"
                      value={customPolicyLabel}
                      onChange={(e) => setCustomPolicyLabel(e.target.value)}
                      className={focusClass}
                      style={inputStyle}
                      data-testid="input-custom-policy-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-300">Description (optional)</Label>
                    <Input
                      placeholder="Brief description of the policy..."
                      value={customPolicyDesc}
                      onChange={(e) => setCustomPolicyDesc(e.target.value)}
                      className={focusClass}
                      style={inputStyle}
                      data-testid="input-custom-policy-desc"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={addCustomPolicy}
                      disabled={!customPolicyLabel.trim()}
                      data-testid="button-submit-custom-policy"
                    >
                      Add Policy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowAddCustomPolicy(false); setCustomPolicyLabel(""); setCustomPolicyDesc(""); }}
                      data-testid="button-cancel-custom-policy"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddCustomPolicy(true)}
                  style={{ color: "#b8860b", borderColor: "rgba(184,134,11,0.4)" }}
                  data-testid="button-add-custom-policy"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Policy
                </Button>
              )}
            </div>

            <div className="border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
              <div className="space-y-2">
                <Label htmlFor="additionalPolicies" className="text-sm text-gray-300">Other Policies</Label>
                <p className="text-xs" style={{ color: "#64748b" }}>
                  Any other policies you want to include in your handbook.
                </p>
                <Textarea
                  id="additionalPolicies"
                  placeholder="Any other policies you want to include in your handbook..."
                  value={formData.additionalPolicies || ""}
                  onChange={(e) => updateField("additionalPolicies", e.target.value)}
                  className={`min-h-[120px] ${focusClass}`}
                  style={inputStyle}
                  data-testid="textarea-additional-policies"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "preview" && (
          <div className="space-y-4" style={{ animation: "scheduleStaggerIn 0.3s ease-out" }}>
            <div
              className="rounded-md p-6"
              style={{
                background: "#ffffff",
                border: "2px solid #b8860b",
              }}
            >
              <ScrollArea className="h-[60vh]">
                <pre className="whitespace-pre-wrap font-mono text-sm" style={{ color: "#1a1a1a" }}>
                  {generateHandbook()}
                </pre>
              </ScrollArea>
            </div>

            <div
              className="flex flex-wrap items-center justify-center gap-3 p-3 rounded-md"
              style={{ background: "#0f1117" }}
              data-testid="preview-action-bar"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                style={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }}
                data-testid="button-preview-print"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                style={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }}
                data-testid="button-preview-download"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyAll}
                style={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }}
                data-testid="button-preview-copy"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy All Text
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
