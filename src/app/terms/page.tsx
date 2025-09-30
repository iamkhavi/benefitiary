import Link from "next/link";
import { ArrowLeft, FileText, Shield, Users, AlertTriangle } from "lucide-react";

export default function TermsPage() {
  const lastUpdated = "December 29, 2024";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/auth/signup" 
                className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Sign Up
              </Link>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <FileText className="h-4 w-4" />
              <span>Legal Document</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Title Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-lg text-gray-600 mb-2">
            Please read these terms carefully before using Benefitiary
          </p>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm">
            <Shield className="h-4 w-4 mr-2" />
            Last updated: {lastUpdated}
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Navigation</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <a href="#acceptance" className="text-blue-600 hover:text-blue-800">1. Acceptance of Terms</a>
            <a href="#service" className="text-blue-600 hover:text-blue-800">2. Service Description</a>
            <a href="#accounts" className="text-blue-600 hover:text-blue-800">3. User Accounts</a>
            <a href="#acceptable-use" className="text-blue-600 hover:text-blue-800">4. Acceptable Use</a>
            <a href="#subscription" className="text-blue-600 hover:text-blue-800">5. Subscription & Billing</a>
            <a href="#intellectual-property" className="text-blue-600 hover:text-blue-800">6. Intellectual Property</a>
            <a href="#data-privacy" className="text-blue-600 hover:text-blue-800">7. Data & Privacy</a>
            <a href="#disclaimers" className="text-blue-600 hover:text-blue-800">8. Disclaimers</a>
            <a href="#limitation" className="text-blue-600 hover:text-blue-800">9. Limitation of Liability</a>
            <a href="#termination" className="text-blue-600 hover:text-blue-800">10. Termination</a>
            <a href="#governing-law" className="text-blue-600 hover:text-blue-800">11. Governing Law</a>
            <a href="#contact" className="text-blue-600 hover:text-blue-800">12. Contact Information</a>
          </div>
        </div>

        {/* Terms Content */}
        <div className="prose prose-lg max-w-none">
          <section id="acceptance" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Users className="h-6 w-6 mr-3 text-blue-600" />
              1. Acceptance of Terms
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-700 leading-relaxed mb-4">
                By accessing, browsing, or using the Benefitiary platform ("Service"), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service ("Terms") and our Privacy Policy.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                These Terms constitute a legally binding agreement between you (either as an individual or on behalf of an entity) and Benefitiary, Inc. ("Company," "we," "us," or "our").
              </p>
              <p className="text-gray-700 leading-relaxed">
                If you do not agree to these Terms, you must not access or use our Service.
              </p>
            </div>
          </section>

          <section id="service" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Service Description</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-700 leading-relaxed mb-4">
                Benefitiary is a Software-as-a-Service (SaaS) platform that provides:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Grant opportunity discovery and matching services</li>
                <li>AI-powered proposal writing assistance</li>
                <li>Application tracking and deadline management</li>
                <li>Collaboration tools for grant writers and organizations</li>
                <li>Analytics and reporting features</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, with or without notice.
              </p>
            </div>
          </section>

          <section id="accounts" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Accounts and Registration</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="font-semibold text-gray-900 mb-3">Account Creation</h4>
              <p className="text-gray-700 leading-relaxed mb-4">
                To use certain features of our Service, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
              </p>
              
              <h4 className="font-semibold text-gray-900 mb-3">Account Security</h4>
              <p className="text-gray-700 leading-relaxed mb-4">
                You are responsible for safeguarding your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account.
              </p>
              
              <h4 className="font-semibold text-gray-900 mb-3">Organization Accounts</h4>
              <p className="text-gray-700 leading-relaxed">
                If you create an account on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms.
              </p>
            </div>
          </section>

          <section id="acceptable-use" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-6 w-6 mr-3 text-amber-600" />
              4. Acceptable Use Policy
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="font-semibold text-gray-900 mb-3">Permitted Uses</h4>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may use our Service only for lawful purposes and in accordance with these Terms. You agree to use the Service in a manner consistent with applicable laws and regulations.
              </p>
              
              <h4 className="font-semibold text-gray-900 mb-3">Prohibited Activities</h4>
              <p className="text-gray-700 leading-relaxed mb-3">You agree not to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Use the Service for any fraudulent, misleading, or illegal purpose</li>
                <li>Submit false or misleading information in grant applications</li>
                <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
                <li>Interfere with or disrupt the Service or servers connected to the Service</li>
                <li>Use automated scripts or bots to access the Service</li>
                <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
                <li>Violate any applicable laws or regulations</li>
              </ul>
            </div>
          </section>

          <section id="subscription" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Subscription and Billing</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="font-semibold text-gray-900 mb-3">Subscription Plans</h4>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our Service is offered through various subscription plans. Pricing and features for each plan are described on our website and may change from time to time.
              </p>
              
              <h4 className="font-semibold text-gray-900 mb-3">Billing and Payment</h4>
              <p className="text-gray-700 leading-relaxed mb-4">
                Subscription fees are billed in advance on a recurring basis (monthly or annually). You authorize us to charge your payment method for all fees incurred under your account.
              </p>
              
              <h4 className="font-semibold text-gray-900 mb-3">Refunds and Cancellation</h4>
              <p className="text-gray-700 leading-relaxed">
                You may cancel your subscription at any time. Cancellations take effect at the end of the current billing period. We do not provide refunds for partial months or unused portions of the Service.
              </p>
            </div>
          </section>

          <section id="intellectual-property" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Intellectual Property Rights</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="font-semibold text-gray-900 mb-3">Our Rights</h4>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Service and its original content, features, and functionality are owned by Benefitiary, Inc. and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
              
              <h4 className="font-semibold text-gray-900 mb-3">Your Content</h4>
              <p className="text-gray-700 leading-relaxed mb-4">
                You retain ownership of any content you submit to the Service. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and display such content solely for the purpose of providing the Service.
              </p>
              
              <h4 className="font-semibold text-gray-900 mb-3">AI-Generated Content</h4>
              <p className="text-gray-700 leading-relaxed">
                Content generated by our AI tools is provided as-is. You are responsible for reviewing and verifying all AI-generated content before use in any grant applications or official documents.
              </p>
            </div>
          </section>

          <section id="data-privacy" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Protection and Privacy</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-700 leading-relaxed mb-4">
                Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference.
              </p>
              <p className="text-gray-700 leading-relaxed">
                We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </div>
          </section>

          <section id="disclaimers" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Disclaimers</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-amber-800 font-medium">
                  Important: The Service is provided "as is" and "as available" without warranties of any kind.
                </p>
              </div>
              <p className="text-gray-700 leading-relaxed mb-4">
                We do not guarantee that grant opportunities displayed on our platform are current, accurate, or that you will be eligible for or successful in obtaining any grants.
              </p>
              <p className="text-gray-700 leading-relaxed">
                We disclaim all warranties, express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
              </p>
            </div>
          </section>

          <section id="limitation" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Limitation of Liability</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-700 leading-relaxed mb-4">
                To the maximum extent permitted by applicable law, Benefitiary, Inc. shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Our total liability to you for any claims arising from or relating to these Terms or the Service shall not exceed the amount you paid us in the twelve (12) months preceding the claim.
              </p>
            </div>
          </section>

          <section id="termination" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Termination</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-700 leading-relaxed mb-4">
                We may terminate or suspend your account and access to the Service immediately, without prior notice, if you breach these Terms or engage in conduct that we determine to be harmful to other users or our business.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Upon termination, your right to use the Service will cease immediately, and we may delete your account and all associated data.
              </p>
            </div>
          </section>

          <section id="governing-law" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Governing Law and Dispute Resolution</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-700 leading-relaxed mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Any disputes arising from these Terms or the Service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.
              </p>
            </div>
          </section>

          <section id="contact" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact Information</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700"><strong>Email:</strong> legal@benefitiary.com</p>
                <p className="text-gray-700"><strong>Address:</strong> Benefitiary, Inc., 123 Business Ave, Suite 100, San Francisco, CA 94105</p>
                <p className="text-gray-700"><strong>Phone:</strong> +1 (555) 123-4567</p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <p className="text-gray-500 text-sm">
            © 2024 Benefitiary, Inc. All rights reserved. | 
            <Link href="/privacy" className="text-blue-600 hover:text-blue-800 ml-1">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}