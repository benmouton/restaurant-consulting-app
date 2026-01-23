import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail } from "lucide-react";
import { Link } from "wouter";

export default function DataDeletion() {
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
            <CardTitle className="text-3xl" data-testid="text-data-deletion-title">Data Deletion Request</CardTitle>
            <p className="text-muted-foreground">How to request deletion of your data</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">Request Data Deletion</h2>
              <p className="text-muted-foreground mb-4">
                If you would like to request deletion of your personal data from our platform, 
                including any data associated with connected social media accounts, please follow 
                the instructions below.
              </p>
            </section>

            <section className="bg-muted/50 rounded-lg p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Request
              </h3>
              <p className="text-muted-foreground mb-4">
                To request deletion of your data, please send an email to:
              </p>
              <a 
                href="mailto:ben@moutonsbistro.com?subject=Data%20Deletion%20Request"
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                data-testid="link-deletion-email"
              >
                ben@moutonsbistro.com
              </a>
              <p className="text-muted-foreground mt-4">
                Please use the subject line: <strong>"Data Deletion Request"</strong>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">What Happens Next</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>We will acknowledge your request within 48 hours</li>
                <li>Your data will be deleted within 30 days of your request</li>
                <li>You will receive confirmation once the deletion is complete</li>
                <li>Any connected social media account tokens will be immediately revoked</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Disconnect Social Media Accounts</h2>
              <p className="text-muted-foreground">
                If you only want to disconnect your social media accounts without deleting your 
                entire account, you can do so at any time through your Account Settings while 
                logged in. This will immediately remove our access to your social media pages.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
