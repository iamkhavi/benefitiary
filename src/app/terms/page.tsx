import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              Terms of Service
            </CardTitle>
            <p className="text-center text-gray-600">
              Last updated: October 2, 2025
            </p>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using Benefitiary ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              Benefitiary is a platform that connects organizations with grant opportunities, provides AI-powered proposal assistance, and offers grant management tools.
            </p>

            <h2>3. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>

            <h2>4. Acceptable Use</h2>
            <p>
              You agree to use the Service only for lawful purposes and in accordance with these Terms. You may not:
            </p>
            <ul>
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Violate any laws in your jurisdiction</li>
              <li>Transmit any harmful or malicious code</li>
              <li>Interfere with or disrupt the Service</li>
            </ul>

            <h2>5. Privacy</h2>
            <p>
              Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service.
            </p>

            <h2>6. Intellectual Property</h2>
            <p>
              The Service and its original content, features, and functionality are owned by Benefitiary and are protected by international copyright, trademark, and other intellectual property laws.
            </p>

            <h2>7. Termination</h2>
            <p>
              We may terminate or suspend your account and access to the Service immediately, without prior notice, for conduct that we believe violates these Terms.
            </p>

            <h2>8. Disclaimer</h2>
            <p>
              The information on this Service is provided on an "as is" basis. To the fullest extent permitted by law, we exclude all representations, warranties, and conditions relating to our Service.
            </p>

            <h2>9. Contact Information</h2>
            <p>
              If you have any questions about these Terms, please contact us at legal@benefitiary.com.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}