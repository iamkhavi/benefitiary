import Link from "next/link";
import { ArrowLeft, Shield, Eye, Lock, Database, Globe, UserCheck } from "lucide-react";

export default function PrivacyPage() {
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
              <Shield className="h-4 w-4" />
              <span>Privacy & Security</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Title Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-lg text-gray-600 mb-2">
            Your privacy and data security are our top priorities
          </p>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm">
            <Lock className="h-4 w-4 mr-2" />
            Last updated: {lastUpdated}
          </div>
        </div>

        {/* Privacy Highlights */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <Shield className="h-8 w-8 text-blue-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Data Protection</h3>
            <p className="text-sm text-gray-600">Enterprise-grade security measures protect your information</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <Eye className="h-8 w-8 text-green-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Transparency</h3>
            <p className="text-sm text-gray-600">Clear information about what data we collect and why</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <UserCheck className="h-8 w-8 text-purple-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Your Control</h3>
            <p className="text-sm text-gray-600">Full control over your personal information and preferences</p>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Navigation</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <a href="#information-collection" className="text-blue-600 hover:text-blue-800">1. Information We Collect</a>
            <a href="#how-we-use" className="text-blue-600 hover:text-blue-800">2. How We Use Information</a>
            <a href="#information-sharing" className="text-blue-600 hover:text-blue-800">3. Information Sharing</a>
            <a href="#data-security" className="text-blue-600 hover:text-blue-800">4. Data Security</a>
            <a href="#cookies-tracking" className="text-blue-600 hover:text-blue-800">5. Cookies & Tracking</a>
            <a href="#third-party" className="text-blue-600 hover:text-blue-800">6. Third-Party Services</a>
            <a href="#data-retention" className="text-blue-600 hover:text-blue-800">7. Data Retention</a>
            <a href="#your-rights" className="text-blue-600 hover:text-blue-800">8. Your Privacy Rights</a>
            <a href="#international" className="text-blue-600 hover:text-blue-800">9. International Transfers</a>
            <a href="#children" className="text-blue-600 hover:text-blue-800">10. Children's Privacy</a>
            <a href="#changes" className="text-blue-600 hover:text-blue-800">11. Policy Changes</a>
            <a href="#contact" className="text-blue-600 hover:text-blue-800">12. Contact Us</a>
          </div>
        </div>

        {/* Privacy Policy Content */}
        <div className="prose prose-lg max-w-none">
          <section id="information-collection" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Database className="h-6 w-6 mr-3 text-blue-600" />
              1. Information We Collect
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="font-semibold text-gray-900 mb-3">Information You Provide</h4>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li><strong>Account Information:</strong> Name, email address, password, and organization details</li>
                <li><strong>Profile Information:</strong> Organization type, size, location, and grant preferences</li>
                <li><strong>Content:</strong> Grant applications, proposals, and other documents you create or upload</li>
                <li><strong>Communication:</strong> Messages, support requests, and feedback you send us</li>
                <li><strong>Payment Information:</strong> Billing details processed securely through our payment providers</li>
              </ul>
              
              <h4 className="font-semibold text-gray-900 mb-3">Information We Collect Automatically</h4>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li><strong>Usage Data:</strong> How you interact with our platform, features used, and time spent</li>
                <li><strong>Device Information:</strong> IP address, browser type, operating system, and device identifiers</li>
                <li><strong>Log Data:</strong> Server logs, error reports, and performance metrics</li>
                <li><strong>Location Data:</strong> General geographic location based on IP address</li>
              </ul>

              <h4 className="font-semibold text-gray-900 mb-3">Information from Third Parties</h4>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>OAuth Providers:</strong> Basic profile information when you sign in with Google</li>
                <li><strong>Grant Databases:</strong> Publicly available grant opportunity information</li>
                <li><strong>Analytics Services:</strong> Aggregated usage statistics and performance data</li>
              </ul>
            </div>
          </section>

          <section id="how-we-use" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Service Provision</h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                    <li>Create and manage your account</li>
                    <li>Provide personalized grant recommendations</li>
                    <li>Enable AI-powered proposal assistance</li>
                    <li>Process payments and manage subscriptions</li>
                    <li>Provide customer support</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Platform Improvement</h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                    <li>Analyze usage patterns and preferences</li>
                    <li>Improve our algorithms and matching</li>
                    <li>Develop new features and services</li>
                    <li>Ensure platform security and stability</li>
                    <li>Conduct research and analytics</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Legal Basis for Processing (GDPR)</h4>
                <p className="text-blue-800 text-sm">
                  We process your personal data based on: (1) your consent, (2) performance of our contract with you, 
                  (3) our legitimate business interests, or (4) compliance with legal obligations.
                </p>
              </div>
            </div>
          </section>

          <section id="information-sharing" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Information Sharing and Disclosure</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-800 font-medium">
                  We do not sell, rent, or trade your personal information to third parties for marketing purposes.
                </p>
              </div>
              
              <h4 className="font-semibold text-gray-900 mb-3">We may share information in these limited circumstances:</h4>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li><strong>Service Providers:</strong> Trusted partners who help us operate our platform (hosting, analytics, payment processing)</li>
                <li><strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                <li><strong>Safety and Security:</strong> To protect our users, platform, or the public from harm</li>
                <li><strong>With Your Consent:</strong> When you explicitly authorize us to share specific information</li>
              </ul>
              
              <h4 className="font-semibold text-gray-900 mb-3">Grant Application Sharing</h4>
              <p className="text-gray-700 leading-relaxed">
                When you submit grant applications through our platform, we may share necessary information with grant providers 
                as part of the application process. This is done only with your explicit consent for each application.
              </p>
            </div>
          </section>

          <section id="data-security" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Lock className="h-6 w-6 mr-3 text-green-600" />
              4. Data Security and Protection
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Technical Safeguards</h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                    <li>End-to-end encryption for data transmission</li>
                    <li>AES-256 encryption for data at rest</li>
                    <li>Multi-factor authentication options</li>
                    <li>Regular security audits and penetration testing</li>
                    <li>Secure cloud infrastructure (SOC 2 compliant)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Organizational Measures</h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                    <li>Employee background checks and training</li>
                    <li>Principle of least privilege access</li>
                    <li>Incident response and breach notification procedures</li>
                    <li>Regular backup and disaster recovery testing</li>
                    <li>Compliance with industry security standards</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                <p className="text-amber-800 text-sm">
                  <strong>Important:</strong> While we implement robust security measures, no system is 100% secure. 
                  We encourage you to use strong passwords and enable two-factor authentication.
                </p>
              </div>
            </div>
          </section>

          <section id="cookies-tracking" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Cookies and Tracking Technologies</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="font-semibold text-gray-900 mb-3">Types of Cookies We Use</h4>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h5 className="font-medium text-gray-900">Essential Cookies</h5>
                  <p className="text-gray-700 text-sm">Required for basic platform functionality, authentication, and security</p>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <h5 className="font-medium text-gray-900">Performance Cookies</h5>
                  <p className="text-gray-700 text-sm">Help us understand how users interact with our platform to improve performance</p>
                </div>
                <div className="border-l-4 border-purple-500 pl-4">
                  <h5 className="font-medium text-gray-900">Functional Cookies</h5>
                  <p className="text-gray-700 text-sm">Remember your preferences and settings to enhance your experience</p>
                </div>
              </div>
              
              <h4 className="font-semibold text-gray-900 mb-3 mt-6">Managing Cookies</h4>
              <p className="text-gray-700 leading-relaxed">
                You can control cookies through your browser settings. However, disabling certain cookies may limit 
                platform functionality. We provide a cookie preference center where you can manage non-essential cookies.
              </p>
            </div>
          </section>

          <section id="your-rights" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <UserCheck className="h-6 w-6 mr-3 text-purple-600" />
              8. Your Privacy Rights and Choices
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Access and Control</h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                    <li>Access your personal information</li>
                    <li>Update or correct your data</li>
                    <li>Download your data (data portability)</li>
                    <li>Delete your account and data</li>
                    <li>Restrict processing of your data</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Communication Preferences</h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                    <li>Opt out of marketing communications</li>
                    <li>Manage notification preferences</li>
                    <li>Control cookie settings</li>
                    <li>Withdraw consent for data processing</li>
                    <li>Object to automated decision-making</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">How to Exercise Your Rights</h4>
                <p className="text-blue-800 text-sm">
                  Contact us at privacy@benefitiary.com or use the privacy controls in your account settings. 
                  We will respond to your request within 30 days (or as required by applicable law).
                </p>
              </div>
            </div>
          </section>

          <section id="international" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Globe className="h-6 w-6 mr-3 text-blue-600" />
              9. International Data Transfers
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-700 leading-relaxed mb-4">
                Benefitiary operates globally, and your information may be transferred to and processed in countries 
                other than your country of residence. We ensure appropriate safeguards are in place for international transfers.
              </p>
              
              <h4 className="font-semibold text-gray-900 mb-3">Transfer Safeguards</h4>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
                <li>Adequacy decisions for transfers to countries with adequate protection</li>
                <li>Binding Corporate Rules for transfers within our corporate group</li>
                <li>Your explicit consent for specific transfers when required</li>
              </ul>
            </div>
          </section>

          <section id="children" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Children's Privacy</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-700 leading-relaxed">
                Our Service is not intended for children under 16 years of age. We do not knowingly collect personal 
                information from children under 16. If you become aware that a child has provided us with personal 
                information, please contact us immediately.
              </p>
            </div>
          </section>

          <section id="changes" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to This Privacy Policy</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-700 leading-relaxed mb-4">
                We may update this Privacy Policy from time to time to reflect changes in our practices, technology, 
                legal requirements, or other factors.
              </p>
              
              <h4 className="font-semibold text-gray-900 mb-3">How We Notify You</h4>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Email notification for material changes</li>
                <li>In-app notifications when you next log in</li>
                <li>Updated "Last Modified" date at the top of this policy</li>
                <li>30-day notice period for significant changes</li>
              </ul>
            </div>
          </section>

          <section id="contact" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact Us</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, 
                please contact us:
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Privacy Officer</h4>
                  <p className="text-gray-700 text-sm"><strong>Email:</strong> privacy@benefitiary.com</p>
                  <p className="text-gray-700 text-sm"><strong>Response Time:</strong> Within 48 hours</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Mailing Address</h4>
                  <p className="text-gray-700 text-sm">
                    Benefitiary, Inc.<br />
                    Attn: Privacy Officer<br />
                    123 Business Ave, Suite 100<br />
                    San Francisco, CA 94105<br />
                    United States
                  </p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">EU Representative</h4>
                <p className="text-blue-800 text-sm">
                  For users in the European Union, our EU representative can be contacted at eu-privacy@benefitiary.com
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <p className="text-gray-500 text-sm">
            © 2024 Benefitiary, Inc. All rights reserved. | 
            <Link href="/terms" className="text-blue-600 hover:text-blue-800 ml-1">Terms of Service</Link>
          </p>
        </div>
      </div>
    </div>
  );
}