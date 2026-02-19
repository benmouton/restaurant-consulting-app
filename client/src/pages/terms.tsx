import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function TermsOfService() {
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
            <CardTitle className="text-3xl" data-testid="text-terms-title">Terms of Service</CardTitle>
            <p className="text-muted-foreground">Restaurant Operations Consulting</p>
            <p className="text-sm text-muted-foreground">Effective Date: January 23, 2026</p>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">
              These Terms of Service ("Terms") govern your access to and use of Restaurant Operations Consulting 
              (the "App," "Service," "Platform"), operated by Restaurant Operations Consulting ("we," "us," or "our").
            </p>
            <p className="text-muted-foreground">
              By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, 
              do not use the Service.
            </p>

            <section>
              <h2 className="text-xl font-semibold mb-3">1. Description of the Service</h2>
              <p className="text-muted-foreground mb-3">
                Restaurant Operations Consulting provides restaurant operators with tools, guidance, automation, 
                and expert-driven features related to operations, training, marketing, scheduling, social media, 
                and business management.
              </p>
              <p className="text-muted-foreground mb-2">The Service may include:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Tailored recommendations and content</li>
                <li>Templates, checklists, and frameworks</li>
                <li>Social media planning and posting tools</li>
                <li>Account integrations with third-party platforms (e.g., Facebook, Instagram)</li>
                <li>Educational and advisory content</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                <strong>The Service is advisory and operational in nature, not legal, financial, or medical advice.</strong>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Eligibility</h2>
              <p className="text-muted-foreground">
                You must be at least 18 years old and have the authority to operate a business or act on behalf 
                of a business to use the Service. By using the Service, you represent that you meet these requirements.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Account Registration</h2>
              <p className="text-muted-foreground mb-2">
                To access certain features, you may be required to create an account. You agree to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Accept responsibility for all activity under your account</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                You are responsible for any actions taken through your account, whether by you or by authorized users.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Third-Party Integrations</h2>
              <p className="text-muted-foreground mb-3">
                The Service may allow you to connect third-party platforms (such as Facebook, Instagram, or other social media services).
              </p>
              <p className="text-muted-foreground mb-2">By connecting a third-party account, you authorize us to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Access permitted data from that platform</li>
                <li>Perform actions on your behalf (such as publishing posts), as explicitly authorized by you</li>
              </ul>
              <p className="text-muted-foreground mt-3 mb-2">We are not responsible for:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Changes, outages, or restrictions imposed by third-party platforms</li>
                <li>Actions taken by those platforms</li>
                <li>Loss of access due to third-party policy changes</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Your use of third-party services remains subject to their own terms and policies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Acceptable Use</h2>
              <p className="text-muted-foreground mb-2">You agree not to use the Service to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Violate any laws or regulations</li>
                <li>Infringe on the rights of others</li>
                <li>Post or distribute unlawful, misleading, defamatory, or harmful content</li>
                <li>Abuse, interfere with, or disrupt the Service or its infrastructure</li>
                <li>Attempt to reverse-engineer or misuse the platform or its features</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                We reserve the right to suspend or terminate access for violations of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Generated Content Disclaimer</h2>
              <p className="text-muted-foreground mb-2">
                The Service may generate content and recommendations. You acknowledge and agree that:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Generated outputs may be inaccurate, incomplete, or inappropriate for your specific situation</li>
                <li>You are responsible for reviewing, verifying, and approving all outputs before use</li>
                <li>Final decisions and actions remain your responsibility</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                <strong>Restaurant Operations Consulting is not liable for decisions made based on generated content.</strong>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Fees and Subscriptions</h2>
              <p className="text-muted-foreground mb-2">
                Some features may require payment or a subscription. All fees:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Are disclosed before purchase</li>
                <li>Are non-refundable unless otherwise stated</li>
                <li>May change with reasonable notice</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Failure to pay may result in suspension or termination of access.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Intellectual Property</h2>
              <p className="text-muted-foreground mb-3">
                All content, software, designs, text, graphics, and features of the Service are owned by or 
                licensed to Restaurant Operations Consulting and are protected by intellectual property laws.
              </p>
              <p className="text-muted-foreground mb-2">
                You are granted a limited, non-exclusive, non-transferable license to use the Service for 
                your internal business purposes. You may not:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Copy, resell, or redistribute the Service</li>
                <li>Use the Service to build a competing product</li>
                <li>Remove or obscure proprietary notices</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Data and Privacy</h2>
              <p className="text-muted-foreground">
                Your use of the Service is subject to our{" "}
                <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, 
                which explains how we collect, use, and protect your data. By using the Service, you consent 
                to the collection and use of information as described in the Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Data Deletion</h2>
              <p className="text-muted-foreground">
                You may request deletion of your data at any time by following the instructions on our{" "}
                <Link href="/data-deletion" className="text-primary hover:underline">Data Deletion page</Link>{" "}
                or by contacting us directly. Certain data may be retained as required by law or for 
                legitimate business purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Service Availability</h2>
              <p className="text-muted-foreground">
                We strive to provide reliable service but do not guarantee uninterrupted or error-free operation. 
                The Service may be modified, suspended, or discontinued at any time without liability.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Limitation of Liability</h2>
              <p className="text-muted-foreground mb-2">
                To the maximum extent permitted by law, Restaurant Operations Consulting shall not be liable for:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Indirect, incidental, or consequential damages</li>
                <li>Loss of profits, revenue, data, or business opportunities</li>
                <li>Errors or omissions in content or recommendations</li>
                <li>Actions taken by third-party platforms</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Your sole remedy for dissatisfaction with the Service is to stop using it.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">13. Indemnification</h2>
              <p className="text-muted-foreground mb-2">
                You agree to indemnify and hold harmless Restaurant Operations Consulting from any claims, damages, 
                losses, or expenses arising from:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Your use of the Service</li>
                <li>Your content or actions</li>
                <li>Your violation of these Terms or applicable laws</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">14. Termination</h2>
              <p className="text-muted-foreground">
                We may suspend or terminate your access at any time for violations of these Terms or misuse 
                of the Service. You may stop using the Service at any time. Upon termination, your right to 
                use the Service ends immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">15. Changes to These Terms</h2>
              <p className="text-muted-foreground">
                We may update these Terms from time to time. Changes will be effective when posted. Continued 
                use of the Service after changes constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">16. Governing Law</h2>
              <p className="text-muted-foreground">
                These Terms are governed by the laws of the State of Texas, without regard to conflict of law principles.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">17. Contact Information</h2>
              <p className="text-muted-foreground mb-2">
                If you have questions about these Terms, contact us at:
              </p>
              <p className="text-muted-foreground">
                <strong>Email:</strong>{" "}
                <a href="mailto:ben@moutonsbistro.com" className="text-primary hover:underline">
                  ben@moutonsbistro.com
                </a>
              </p>
              <p className="text-muted-foreground">
                <strong>Website:</strong>{" "}
                <a href="https://restaurantai.consulting" className="text-primary hover:underline">
                  https://restaurantai.consulting
                </a>
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
