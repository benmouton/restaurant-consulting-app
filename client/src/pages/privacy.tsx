import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl" data-testid="text-privacy-title">Privacy Policy</CardTitle>
            <p className="text-muted-foreground">Last updated: January 2026</p>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-muted-foreground">
                Restaurant AI Consulting ("we", "our", or "us") is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, and safeguard your information when you 
                use our restaurant consulting platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
              <p className="text-muted-foreground mb-2">We collect the following types of information:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li><strong>Account Information:</strong> Name, email address, and profile information from your Replit account when you sign in</li>
                <li><strong>Restaurant Information:</strong> Restaurant name, role, and operational data you provide</li>
                <li><strong>Social Media Access:</strong> When you connect social media accounts (Facebook, Instagram, Google Business Profile), we access only the permissions needed to post content on your behalf</li>
                <li><strong>Usage Data:</strong> Information about how you interact with our platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>To provide and improve our restaurant consulting services</li>
                <li>To post content to your connected social media accounts at your direction</li>
                <li>To personalize your experience and provide relevant recommendations</li>
                <li>To communicate with you about your account and our services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Social Media Integrations</h2>
              <p className="text-muted-foreground mb-2">
                When you connect your social media accounts, we request only the permissions necessary to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>View your Facebook Pages and Instagram Business accounts</li>
                <li>Post content to your pages on your behalf</li>
                <li>Access basic profile information to identify your accounts</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                <strong>You can disconnect your social media accounts at any time</strong> through your Account Settings. 
                When you disconnect, we immediately delete the stored access tokens.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
              <p className="text-muted-foreground">
                We implement industry-standard security measures to protect your data. Social media access tokens 
                are encrypted using AES-256-GCM encryption before storage. We use secure HTTPS connections for all 
                data transmission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Data Sharing</h2>
              <p className="text-muted-foreground">
                <strong>We do not sell, rent, or share your personal information with third parties</strong> for 
                their marketing purposes. We only share data when:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>You direct us to post content to your social media accounts</li>
                <li>Required by law or to protect our legal rights</li>
                <li>With service providers who assist in operating our platform (under strict confidentiality agreements)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
              <p className="text-muted-foreground mb-2">You have the right to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Delete your account and associated data</li>
                <li>Disconnect social media accounts at any time</li>
                <li>Export your data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your data for as long as your account is active. When you delete your account or 
                disconnect a social media integration, we delete the associated data within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of any significant 
                changes by posting the new policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy or your data, please contact us through the 
                platform or at your designated support channel.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
