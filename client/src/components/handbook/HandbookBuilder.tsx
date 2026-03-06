import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";
import type { HandbookSettings } from "@shared/schema";

const defaultHolidays = ["Thanksgiving Day", "Christmas Day", "Easter Sunday"];

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

const CUSTOM_POLICIES_KEY = "handbook-custom-policies";

interface CustomPolicy {
  id: string;
  label: string;
  desc: string;
  enabled: boolean;
}

function getStoredCustomPolicies(): CustomPolicy[] {
  try {
    const stored = localStorage.getItem(CUSTOM_POLICIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCustomPolicies(policies: CustomPolicy[]) {
  localStorage.setItem(CUSTOM_POLICIES_KEY, JSON.stringify(policies));
}

function getSectionCompleteness(formData: Partial<HandbookSettings>): Record<string, number> {
  const restaurantFields = [
    formData.restaurantName,
    formData.ownerNames,
    formData.restaurantAddress,
    formData.restaurantPhone,
    formData.restaurantEmail,
    formData.missionStatement,
  ];
  const restaurantFilled = restaurantFields.filter(f => f && String(f).trim().length > 0).length;

  const operationsFields = [
    formData.schedulingApp,
    formData.orientationDays,
    formData.evaluationSchedule,
  ];
  const operationsFilled = operationsFields.filter(f => f && String(f).trim().length > 0).length;

  const uniformFields = [
    formData.uniformDiningRoom,
    formData.uniformKitchen,
  ];
  const uniformFilled = uniformFields.filter(f => f && String(f).trim().length > 0).length;

  const benefitsFields = [
    formData.employeeMealPolicy,
    formData.parkingPolicy,
  ];
  const benefitsFilled = benefitsFields.filter(f => f && String(f).trim().length > 0).length;

  return {
    restaurant: Math.round((restaurantFilled / restaurantFields.length) * 100),
    operations: Math.round((operationsFilled / operationsFields.length) * 100),
    uniform: Math.round((uniformFilled / uniformFields.length) * 100),
    benefits: Math.round((benefitsFilled / benefitsFields.length) * 100),
  };
}

export function HandbookBuilder({ user }: { user?: any }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("setup");
  const [newHoliday, setNewHoliday] = useState("");
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
    uniformDiningRoom: "Shoes - non-slip, close-toed shoes\nPants - jeans, black, or khaki pants, shorts, or skirt with solid color belt\nShirts - clean restaurant-branded t-shirt\nAppearance - Clean and well-groomed hair, pulled back off shoulder. Well-groomed hands and fingernails.\nAccessories - No excessive cologne, perfume, make-up or jewelry. No earrings longer than 1 inch.",
    uniformKitchen: "Shoes - Black work shoes with non-slip soles, no tennis shoes\nPants - Black pants or jeans, no shorts\nShirts - Black t-shirt or restaurant-branded shirt\nAppearance - Clean, well-groomed hair, hands and fingernails\nHats - A hat or hair net required at all times when working with food",
    employeeMealPolicy: "Employees receive a $5 discount off the regular price of all menu items during each shift. Employee meals can be purchased either before or after your shift or on a scheduled break.",
    parkingPolicy: "Park in employee designated parking areas only.",
    schedulingApp: "homebase",
    evaluationSchedule: "January and June",
    orientationDays: 30,
    closedHolidays: defaultHolidays,
    alcoholPolicy: "",
    socialMediaPolicy: "",
    additionalPolicies: "",
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

  const addHoliday = () => {
    if (newHoliday.trim() && !formData.closedHolidays?.includes(newHoliday.trim())) {
      setFormData({
        ...formData,
        closedHolidays: [...(formData.closedHolidays || []), newHoliday.trim()],
      });
      setNewHoliday("");
    }
  };

  const removeHoliday = (holiday: string) => {
    setFormData({
      ...formData,
      closedHolidays: formData.closedHolidays?.filter(h => h !== holiday) || [],
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

    return `${name.toUpperCase()}
EMPLOYEE HANDBOOK

═══════════════════════════════════════════════════════════════════

WELCOME TO OUR TEAM!

We welcome you to ${name} and look forward to the opportunity to work with you. We want you to know that we recognize our employees as our most valuable asset. Our continued success in providing the highest quality of food, beverages, and service to our customers depends on having quality people like yourself and your fellow employees.

We want you to enjoy your time here and are committed to helping you succeed in your new job. We have prepared this handbook to answer some of the questions that you may have concerning ${name} and its policies. This handbook is intended solely as a guide. Read it thoroughly. If you have questions about anything, contact a manager for assistance.

We hope you find your time with us to be an enjoyable and rewarding experience!

Sincerely,
${owners}

═══════════════════════════════════════════════════════════════════

COMPANY INFORMATION

${name}
${address}
Phone: ${phone}
Email: ${email}
Website: ${website}

═══════════════════════════════════════════════════════════════════

MISSION STATEMENT

${mission}

═══════════════════════════════════════════════════════════════════

OUR WAY OF DOING BUSINESS

${name}'s success depends on our people. Our restaurant can only prosper and provide opportunities for employment and growth when we continually improve ourselves and the work that we do.

We believe that a commitment to uncompromising values and integrity should always guide our decisions and actions as we pursue our goals. Following are the core values that form the foundation of our success:

• We believe in providing all customers with exceptional service
• We believe in honesty and trust
• We believe in ongoing training and development of our people
• We believe our continued success depends on teamwork
• We believe in doing business in a professional and orderly manner

═══════════════════════════════════════════════════════════════════

EMPLOYMENT POLICIES

It is the policy of ${name} to hire only United States citizens and aliens who are authorized to work in this country. As required by law, employees will be required to provide original documents that establish this authorization within three days of their date of hire.

NON-DISCRIMINATION

${name} is an equal opportunity employer. We will not tolerate discrimination based on race, sex, age, national origin, religion, sexual orientation, or disability. Employment decisions will be made only for legitimate business reasons based upon qualifications and other nondiscriminatory factors.

AGE REQUIREMENTS

All servers and bartenders must be at least 18 years of age. Employees under the age of 18 must comply with all federal wage and hour guidelines. No employees under 18 years can take orders for or serve alcoholic beverages.

═══════════════════════════════════════════════════════════════════

ORIENTATION PERIOD

You have been through our employee selection process and have been selected for employment. We have a ${orientDays}-day Orientation Period that allows both you and the Company to determine if it's a good fit. During this period you will begin your training and be observed by management.

TRAINING

To help you be successful in your job you will receive adequate training. You will not be expected to be on your own until you are ready. We want you to be a knowledgeable and productive member of our staff.

EVALUATIONS

All employees receive written and verbal performance evaluations ${evalSchedule}. The evaluation process is intended to let you know how well you're performing and help you be more effective and productive.

═══════════════════════════════════════════════════════════════════

SCHEDULES

Schedules are prepared to meet the work demands of the restaurant. Schedules are posted weekly through ${schedApp}. Each employee is responsible for working their shifts.

• Arrive 10-15 minutes before your shift begins
• Clock in when your shift begins and be ready to start work immediately
• Schedule changes may be allowed only if you find a replacement and get manager approval

OVERTIME

In accordance with Federal Minimum Wage Law, employees are paid overtime when they work more than 40 hours in one week at one and one-half times their basic straight time rate.

═══════════════════════════════════════════════════════════════════

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

═══════════════════════════════════════════════════════════════════

HARASSMENT POLICY

It is this restaurant's policy to treat all personnel with dignity and respect. We strive to provide everyone a workplace that is free of harassment of any kind. Employees are encouraged to promptly report incidents of harassment.

SEXUAL HARASSMENT

All employees have a right to be free from sexual harassment. ${name} does not condone actions, words, jokes, or comments that a reasonable person would regard as sexually harassing or coercive. Anyone who experiences harassment should report it promptly to management.

═══════════════════════════════════════════════════════════════════

ATTENDANCE & ABSENCES

All employees are expected to work on a regular, consistent basis. Excessive absenteeism may result in disciplinary action.

• Call and talk to a manager at least 2 hours before your scheduled shift if you will be late or absent
• Any employee who does not call or report to work for two consecutive shifts will be considered to have voluntarily resigned
• Submit leave requests at least two weeks prior to the scheduled leave date

TARDINESS

Always arrive at the restaurant 10-15 minutes before your shift. Your scheduled time is when you are expected to be on your job, not when you arrive at the restaurant. Repeated tardiness is grounds for termination.

RESIGNATIONS

You are requested to give a two-week notice of your plans to leave. This is a professional courtesy that ensures you are eligible for re-hire.

═══════════════════════════════════════════════════════════════════

TIME CLOCK & PAYROLL

• Arrive 10-15 minutes before your scheduled start time
• You may clock in within 5 minutes of the start of your shift
• Tampering or falsifying time records may result in termination

TIP REPORTING

All tips you receive are taxable income. You are required by federal law to report and record your actual tips for each shift. We strongly encourage you to accurately report your tip income.

PAYROLL

Paychecks are available every other week. Federal and state withholding taxes are authorized based on your W-4 form.

═══════════════════════════════════════════════════════════════════

HOLIDAYS & VACATIONS

Due to the nature of the restaurant business you may be required to work holidays. The restaurant is closed on: ${holidays}.

VACATIONS

Full-time salaried employees who have been with the restaurant for 12 consecutive months are eligible for one week paid vacation. Vacation requests should be submitted at least one month in advance.

═══════════════════════════════════════════════════════════════════

EMPLOYEE MEALS

${mealPolicy}

═══════════════════════════════════════════════════════════════════

DRESS CODE

DINING ROOM DRESS CODE:
${diningUniform}

KITCHEN DRESS CODE:
${kitchenUniform}

═══════════════════════════════════════════════════════════════════

PARKING

${parkingPolicy}

═══════════════════════════════════════════════════════════════════

SAFETY & SANITATION

${name} is committed to maintaining a safe workplace for all employees. Safety is everyone's responsibility.

Basic Safety Guidelines:
• Wipe up spills immediately
• Never run in hallways or kitchen
• Wear shoes with non-slip soles
• Report defective equipment to management immediately
• Never operate equipment without proper training
• Let people know when carrying anything hot
• Use proper lifting techniques

SANITATION

We are committed to sanitation and food safety. Follow safe food handling procedures at all times:
• Keep your hands washed
• Sanitize everything
• Prevent cross-contamination
• Keep food at proper temperatures (below 45°F or above 140°F)
• Store food correctly

═══════════════════════════════════════════════════════════════════

ALCOHOL SERVICE POLICY

As a restaurant that sells alcoholic beverages, we are committed to responsible alcohol service:

1. We will not serve alcoholic beverages to an intoxicated person
2. We will not knowingly serve a person under the legal drinking age
3. Card anyone who appears to be under 30 years old
4. Offer nonalcoholic alternatives
5. Provide taxi service for intoxicated customers if needed

${formData.alcoholPolicy || ""}

═══════════════════════════════════════════════════════════════════

SOCIAL MEDIA POLICY

Employees may use social media in any way they choose as long as it does not:
• Impair the work of any employee
• Harass or demean any employee
• Disrupt the flow of work
• Disclose confidential or proprietary information
• Harm the goodwill and reputation of ${name}

${formData.socialMediaPolicy || ""}

═══════════════════════════════════════════════════════════════════

CUSTOMER SERVICE

Our restaurant exists only because of customers. Taking care of our customers is our highest priority. At ${name}, the customer always comes first!

HANDLING COMPLAINTS
• Don't get defensive
• Remove the offending item immediately
• Apologize and tell the customer you will take care of the problem
• Don't hesitate to ask a manager for assistance

TELEPHONE COURTESY
• Answer the phone promptly, within two rings
• Always answer in a friendly, polite manner
• Thank the person for calling

═══════════════════════════════════════════════════════════════════

TEAMWORK

We cannot achieve our goals without working together as a team. If a co-worker is overloaded and you're not, help them. Pitch in to help a customer whether they are technically yours or not. Genuine teamwork makes for a much more enjoyable work experience.

═══════════════════════════════════════════════════════════════════

EMERGENCY PROCEDURES

ACCIDENTS
Report all accidents, no matter how minor, to the manager on duty.

ROBBERY
DO NOT RESIST. Your safety is our highest priority. Always cooperate fully.

FIRE
Know the location of fire extinguishers. If the fire alarm sounds, assist guests to the nearest exit immediately.

═══════════════════════════════════════════════════════════════════

${formData.additionalPolicies ? `ADDITIONAL POLICIES

${formData.additionalPolicies}

═══════════════════════════════════════════════════════════════════

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

  const completeness = getSectionCompleteness(formData);

  if (isLoading) {
    return (
      <div className="rounded-md p-8 flex items-center justify-center" style={{ background: "#0f1117", minHeight: 256 }}>
        <Loader2 className="h-8 w-8 animate-spin gold-text" />
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
              <BookOpen className="h-5 w-5 gold-text" />
              Employee Handbook Builder
            </h3>
            <p className="text-sm mt-1" style={{ color: "hsl(220,10%,55%)" }}>
              Create a customized employee handbook for your restaurant
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              data-testid="button-print-handbook"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              data-testid="button-save-handbook"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </Button>
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
                  borderBottom: isActive ? "2px solid hsl(38,55%,52%)" : "2px solid transparent",
                }}
                data-testid={`tab-handbook-${tab.id}`}
              >
                <TabIcon className={`h-4 w-4 ${isActive ? "gold-text" : ""}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "setup" && (
          <div className="space-y-6" style={{ animation: "scheduleStaggerIn 0.3s ease-out" }}>
            <div className="rounded-md p-4 space-y-4" style={{ background: "#0f1117" }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-white flex flex-wrap items-center gap-2">
                  <Building2 className="h-4 w-4 gold-text" />
                  Restaurant Information
                </h3>
                <div className="flex items-center gap-2 min-w-[120px]">
                  <Progress value={completeness.restaurant} className="h-1.5 flex-1 [&>div]:bg-[hsl(38,55%,52%)]" />
                  <span className="text-xs gold-text">{completeness.restaurant}%</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="restaurantName" className="text-sm text-gray-300">Restaurant Name</Label>
                  <Input
                    id="restaurantName"
                    placeholder="e.g., The Golden Fork"
                    value={formData.restaurantName || ""}
                    onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                    className="border-[hsl(232,15%,20%)] focus-visible:ring-[hsl(38,55%,52%)]"
                    style={{ background: "#0f1117" }}
                    data-testid="input-restaurant-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerNames" className="text-sm text-gray-300">Owner Name(s)</Label>
                  <Input
                    id="ownerNames"
                    placeholder="e.g., John and Jane Smith"
                    value={formData.ownerNames || ""}
                    onChange={(e) => setFormData({ ...formData, ownerNames: e.target.value })}
                    className="border-[hsl(232,15%,20%)] focus-visible:ring-[hsl(38,55%,52%)]"
                    style={{ background: "#0f1117" }}
                    data-testid="input-owner-names"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="restaurantAddress" className="text-sm text-gray-300">Address</Label>
                <Input
                  id="restaurantAddress"
                  placeholder="e.g., 123 Main Street, Austin, TX 78701"
                  value={formData.restaurantAddress || ""}
                  onChange={(e) => setFormData({ ...formData, restaurantAddress: e.target.value })}
                  className="border-[hsl(232,15%,20%)] focus-visible:ring-[hsl(38,55%,52%)]"
                  style={{ background: "#0f1117" }}
                  data-testid="input-restaurant-address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="restaurantPhone" className="flex flex-wrap items-center gap-1 text-sm text-gray-300">
                    <Phone className="h-3 w-3 gold-text" />
                    Phone
                  </Label>
                  <Input
                    id="restaurantPhone"
                    placeholder="(512) 555-1234"
                    value={formData.restaurantPhone || ""}
                    onChange={(e) => setFormData({ ...formData, restaurantPhone: e.target.value })}
                    className="border-[hsl(232,15%,20%)] focus-visible:ring-[hsl(38,55%,52%)]"
                    style={{ background: "#0f1117" }}
                    data-testid="input-restaurant-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restaurantEmail" className="flex flex-wrap items-center gap-1 text-sm text-gray-300">
                    <Mail className="h-3 w-3 gold-text" />
                    Email
                  </Label>
                  <Input
                    id="restaurantEmail"
                    placeholder="manager@restaurant.com"
                    value={formData.restaurantEmail || ""}
                    onChange={(e) => setFormData({ ...formData, restaurantEmail: e.target.value })}
                    className="border-[hsl(232,15%,20%)] focus-visible:ring-[hsl(38,55%,52%)]"
                    style={{ background: "#0f1117" }}
                    data-testid="input-restaurant-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restaurantWebsite" className="flex flex-wrap items-center gap-1 text-sm text-gray-300">
                    <Globe className="h-3 w-3 gold-text" />
                    Website
                  </Label>
                  <Input
                    id="restaurantWebsite"
                    placeholder="www.restaurant.com"
                    value={formData.restaurantWebsite || ""}
                    onChange={(e) => setFormData({ ...formData, restaurantWebsite: e.target.value })}
                    className="border-[hsl(232,15%,20%)] focus-visible:ring-[hsl(38,55%,52%)]"
                    style={{ background: "#0f1117" }}
                    data-testid="input-restaurant-website"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="missionStatement" className="text-sm text-gray-300">Mission Statement</Label>
                <Textarea
                  id="missionStatement"
                  placeholder="Your restaurant's mission and values..."
                  value={formData.missionStatement || ""}
                  onChange={(e) => setFormData({ ...formData, missionStatement: e.target.value })}
                  className="min-h-[100px] border-[hsl(232,15%,20%)] focus-visible:ring-[hsl(38,55%,52%)]"
                  style={{ background: "#0f1117" }}
                  data-testid="textarea-mission-statement"
                />
              </div>
            </div>

            <div className="rounded-md p-4 space-y-4" style={{ background: "#0f1117" }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-white flex flex-wrap items-center gap-2">
                  <Clock className="h-4 w-4 gold-text" />
                  Operations
                </h3>
                <div className="flex items-center gap-2 min-w-[120px]">
                  <Progress value={completeness.operations} className="h-1.5 flex-1 [&>div]:bg-[hsl(38,55%,52%)]" />
                  <span className="text-xs gold-text">{completeness.operations}%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schedulingApp" className="text-sm text-gray-300">Scheduling App</Label>
                  <Select
                    value={formData.schedulingApp || ""}
                    onValueChange={(value) => setFormData({ ...formData, schedulingApp: value })}
                  >
                    <SelectTrigger
                      id="schedulingApp"
                      className="border-[hsl(232,15%,20%)] focus:ring-[hsl(38,55%,52%)]"
                      style={{ background: "#0f1117" }}
                      data-testid="select-scheduling-app"
                    >
                      <SelectValue placeholder="Select app" />
                    </SelectTrigger>
                    <SelectContent>
                      {schedulingApps.map((app) => (
                        <SelectItem key={app.value} value={app.value}>
                          {app.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orientationDays" className="text-sm text-gray-300">Orientation Period (days)</Label>
                  <Input
                    id="orientationDays"
                    type="number"
                    min={1}
                    max={90}
                    value={formData.orientationDays || 30}
                    onChange={(e) => setFormData({ ...formData, orientationDays: parseInt(e.target.value) || 30 })}
                    className="border-[hsl(232,15%,20%)] focus-visible:ring-[hsl(38,55%,52%)]"
                    style={{ background: "#0f1117" }}
                    data-testid="input-orientation-days"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="evaluationSchedule" className="text-sm text-gray-300">Evaluation Schedule</Label>
                  <Input
                    id="evaluationSchedule"
                    placeholder="e.g., January and June"
                    value={formData.evaluationSchedule || ""}
                    onChange={(e) => setFormData({ ...formData, evaluationSchedule: e.target.value })}
                    className="border-[hsl(232,15%,20%)] focus-visible:ring-[hsl(38,55%,52%)]"
                    style={{ background: "#0f1117" }}
                    data-testid="input-evaluation-schedule"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex flex-wrap items-center gap-2 text-sm text-gray-300">
                  <Calendar className="h-4 w-4 gold-text" />
                  Closed Holidays
                </Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.closedHolidays?.map((holiday) => (
                    <Badge
                      key={holiday}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {holiday}
                      <button
                        onClick={() => removeHoliday(holiday)}
                        className="ml-1"
                        data-testid={`button-remove-holiday-${holiday.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input
                    placeholder="Add a holiday..."
                    value={newHoliday}
                    onChange={(e) => setNewHoliday(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHoliday())}
                    className="flex-1 border-[hsl(232,15%,20%)] focus-visible:ring-[hsl(38,55%,52%)]"
                    style={{ background: "#0f1117" }}
                    data-testid="input-new-holiday"
                  />
                  <Button variant="outline" size="sm" onClick={addHoliday} data-testid="button-add-holiday">
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-md p-4 space-y-4" style={{ background: "#0f1117" }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-white flex flex-wrap items-center gap-2">
                  <Shirt className="h-4 w-4 gold-text" />
                  Uniform Policy
                </h3>
                <div className="flex items-center gap-2 min-w-[120px]">
                  <Progress value={completeness.uniform} className="h-1.5 flex-1 [&>div]:bg-[hsl(38,55%,52%)]" />
                  <span className="text-xs gold-text">{completeness.uniform}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="uniformDiningRoom" className="text-sm text-gray-300">Dining Room Dress Code</Label>
                <Textarea
                  id="uniformDiningRoom"
                  placeholder="Describe the uniform requirements for dining room staff..."
                  value={formData.uniformDiningRoom || ""}
                  onChange={(e) => setFormData({ ...formData, uniformDiningRoom: e.target.value })}
                  className="min-h-[120px] font-mono text-sm border-[hsl(232,15%,20%)] focus-visible:ring-[hsl(38,55%,52%)]"
                  style={{ background: "#0f1117" }}
                  data-testid="textarea-uniform-dining"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="uniformKitchen" className="text-sm text-gray-300">Kitchen Dress Code</Label>
                <Textarea
                  id="uniformKitchen"
                  placeholder="Describe the uniform requirements for kitchen staff..."
                  value={formData.uniformKitchen || ""}
                  onChange={(e) => setFormData({ ...formData, uniformKitchen: e.target.value })}
                  className="min-h-[120px] font-mono text-sm border-[hsl(232,15%,20%)] focus-visible:ring-[hsl(38,55%,52%)]"
                  style={{ background: "#0f1117" }}
                  data-testid="textarea-uniform-kitchen"
                />
              </div>
            </div>

            <div className="rounded-md p-4 space-y-4" style={{ background: "#0f1117" }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-white flex flex-wrap items-center gap-2">
                  <Users className="h-4 w-4 gold-text" />
                  Employee Benefits
                </h3>
                <div className="flex items-center gap-2 min-w-[120px]">
                  <Progress value={completeness.benefits} className="h-1.5 flex-1 [&>div]:bg-[hsl(38,55%,52%)]" />
                  <span className="text-xs gold-text">{completeness.benefits}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeMealPolicy" className="text-sm text-gray-300">Employee Meal Policy</Label>
                <Textarea
                  id="employeeMealPolicy"
                  placeholder="Describe your employee meal discount or policy..."
                  value={formData.employeeMealPolicy || ""}
                  onChange={(e) => setFormData({ ...formData, employeeMealPolicy: e.target.value })}
                  className="min-h-[80px] border-[hsl(232,15%,20%)] focus-visible:ring-[hsl(38,55%,52%)]"
                  style={{ background: "#0f1117" }}
                  data-testid="textarea-meal-policy"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parkingPolicy" className="text-sm text-gray-300">Parking Policy</Label>
                <Input
                  id="parkingPolicy"
                  placeholder="e.g., Park in employee designated areas only"
                  value={formData.parkingPolicy || ""}
                  onChange={(e) => setFormData({ ...formData, parkingPolicy: e.target.value })}
                  className="border-[hsl(232,15%,20%)] focus-visible:ring-[hsl(38,55%,52%)]"
                  style={{ background: "#0f1117" }}
                  data-testid="input-parking-policy"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "policies" && (
          <div className="space-y-5" style={{ animation: "scheduleStaggerIn 0.3s ease-out" }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-white flex flex-wrap items-center gap-2">
                <Shield className="h-4 w-4 gold-text" />
                Standard Policies
              </h3>
              <Badge variant="secondary" data-testid="badge-policy-count">
                {enabledStandardCount + enabledCustomCount} of {STANDARD_POLICIES.length + customPolicies.length} included
              </Badge>
            </div>
            <p className="text-sm" style={{ color: "hsl(220,10%,55%)" }}>
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
                      border: "1px solid hsl(232,15%,20%)",
                    }}
                    data-testid={`policy-section-${policy.key}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        className="shrink-0 mt-0.5 rounded-md flex items-center justify-center transition-colors"
                        style={{
                          width: 28,
                          height: 28,
                          background: isOn ? "hsl(38,55%,52%)" : "transparent",
                          border: isOn ? "none" : "1px solid hsl(232,15%,25%)",
                          color: isOn ? "#0f1117" : "hsl(220,10%,55%)",
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
                        <div className="text-xs" style={{ color: "hsl(220,10%,55%)" }}>{policy.desc}</div>
                      </div>
                    </div>

                    {isOn && policy.key === "alcohol" && (
                      <div className="pl-10 space-y-1">
                        <Label htmlFor="alcoholPolicy" className="text-xs" style={{ color: "hsl(220,10%,55%)" }}>
                          Custom notes (optional)
                        </Label>
                        <Textarea
                          id="alcoholPolicy"
                          placeholder="Any additional alcohol service policies specific to your restaurant..."
                          value={formData.alcoholPolicy || ""}
                          onChange={(e) => setFormData({ ...formData, alcoholPolicy: e.target.value })}
                          className="min-h-[80px] text-sm border-[hsl(232,15%,20%)] focus-visible:ring-[hsl(38,55%,52%)]"
                          style={{ background: "#0f1117" }}
                          data-testid="textarea-alcohol-policy"
                        />
                      </div>
                    )}

                    {isOn && policy.key === "socialMedia" && (
                      <div className="pl-10 space-y-1">
                        <Label htmlFor="socialMediaPolicy" className="text-xs" style={{ color: "hsl(220,10%,55%)" }}>
                          Custom notes (optional)
                        </Label>
                        <Textarea
                          id="socialMediaPolicy"
                          placeholder="Any additional social media guidelines specific to your restaurant..."
                          value={formData.socialMediaPolicy || ""}
                          onChange={(e) => setFormData({ ...formData, socialMediaPolicy: e.target.value })}
                          className="min-h-[80px] text-sm border-[hsl(232,15%,20%)] focus-visible:ring-[hsl(38,55%,52%)]"
                          style={{ background: "#0f1117" }}
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
                  <Plus className="h-3 w-3 gold-text" />
                  Custom Policies
                </h4>
                {customPolicies.map((policy) => (
                  <div
                    key={policy.id}
                    className="rounded-md p-3 space-y-2 transition-colors"
                    style={{
                      background: "#0f1117",
                      border: "1px solid hsl(232,15%,20%)",
                    }}
                    data-testid={`policy-section-${policy.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        className="shrink-0 mt-0.5 rounded-md flex items-center justify-center transition-colors"
                        style={{
                          width: 28,
                          height: 28,
                          background: policy.enabled ? "hsl(38,55%,52%)" : "transparent",
                          border: policy.enabled ? "none" : "1px solid hsl(232,15%,25%)",
                          color: policy.enabled ? "#0f1117" : "hsl(220,10%,55%)",
                        }}
                        onClick={() => toggleCustomPolicy(policy.id)}
                        data-testid={`toggle-custom-policy-${policy.id}`}
                      >
                        {policy.enabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-white">{policy.label}</div>
                        {policy.desc && (
                          <div className="text-xs" style={{ color: "hsl(220,10%,55%)" }}>{policy.desc}</div>
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
                  style={{ background: "#0f1117", border: "1px solid hsl(38,55%,52%)" }}
                >
                  <h4 className="text-sm font-semibold text-white">Add Custom Policy</h4>
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-300">Policy Name</Label>
                    <Input
                      placeholder="e.g., Technology Usage"
                      value={customPolicyLabel}
                      onChange={(e) => setCustomPolicyLabel(e.target.value)}
                      className="border-[hsl(232,15%,20%)] focus-visible:ring-[hsl(38,55%,52%)]"
                      style={{ background: "#0f1117" }}
                      data-testid="input-custom-policy-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-300">Description (optional)</Label>
                    <Input
                      placeholder="Brief description of the policy..."
                      value={customPolicyDesc}
                      onChange={(e) => setCustomPolicyDesc(e.target.value)}
                      className="border-[hsl(232,15%,20%)] focus-visible:ring-[hsl(38,55%,52%)]"
                      style={{ background: "#0f1117" }}
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
                  className="gold-text"
                  data-testid="button-add-custom-policy"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Policy
                </Button>
              )}
            </div>

            <div className="border-t pt-4" style={{ borderColor: "hsl(232,15%,20%)" }}>
              <div className="space-y-2">
                <Label htmlFor="additionalPolicies" className="text-sm text-gray-300">Other Policies</Label>
                <p className="text-xs" style={{ color: "hsl(220,10%,55%)" }}>
                  Any other policies you want to include in your handbook.
                </p>
                <Textarea
                  id="additionalPolicies"
                  placeholder="Any other policies you want to include in your handbook..."
                  value={formData.additionalPolicies || ""}
                  onChange={(e) => setFormData({ ...formData, additionalPolicies: e.target.value })}
                  className="min-h-[120px] border-[hsl(232,15%,20%)] focus-visible:ring-[hsl(38,55%,52%)]"
                  style={{ background: "#0f1117" }}
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
                border: "2px solid hsl(38,55%,52%)",
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
              <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-preview-print">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPdf} data-testid="button-preview-download">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyAll} data-testid="button-preview-copy">
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
