import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              Privacy Policy
            </CardTitle>
            <p className="text-center text-gray-600">
              Last updated: October 2, 2025
            </p>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <h2>1. Information We Collect</h2>
            <p>
              We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.
            </p>

            <h3>Personal Information</h3>
            <ul>
              <li>Name and email address</li>
              <li>Organization information</li>
              <li>Grant preferences and interests</li>
              <li>Payment information (processed securely by our payment providers)</li>
            </ul>

            <h3>Usage Information</h3>
            <ul>
              <li>How you interact with our Service</li>
              <li>Pages visited and features used</li>
              <li>Search queries and grant applications</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve our Service</li>
              <li>Match you with relevant grant opportunities</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send you updates and marketing communications (with your consent)</li>
              <li>Provide customer support</li>
            </ul>

            <h2>3. Information Sharing</h2>
            <p>
              We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.
            </p>

            <h3>We may share information with:</h3>
            <ul>
              <li>Service providers who assist in operating our Service</li>
              <li>Payment processors for billing purposes</li>
              <li>Legal authorities when required by law</li>
            </ul>

            <h2>4. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>

            <h2>5. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and personal information</li>
              <li>Opt out of marketing communications</li>
            </ul>

            <h2>6. Cookies and Tracking</h2>
            <p>
              We use cookies and similar technologies to enhance your experience, analyze usage patterns, and provide personalized content.
            </p>

            <h2>7. Third-Party Services</h2>
            <p>
              Our Service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties.
            </p>

            <h2>8. Children's Privacy</h2>
            <p>
              Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
            </p>

            <h2>9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page.
            </p>

            <h2>10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at privacy@benefitiary.com.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}