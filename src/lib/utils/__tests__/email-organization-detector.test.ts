import { 
  detectOrganizationFromEmail, 
  suggestOrganizationSize, 
  suggestCountryFromDomain 
} from '../email-organization-detector';

describe('Email Organization Detector', () => {
  describe('detectOrganizationFromEmail', () => {
    it('detects personal Gmail accounts correctly', () => {
      const result = detectOrganizationFromEmail('john.doe@gmail.com');
      
      expect(result.name).toBe("john.doe's Organization");
      expect(result.type).toBe('other');
      expect(result.isWorkEmail).toBe(false);
      expect(result.domain).toBe('gmail.com');
    });

    it('detects healthcare organizations', () => {
      const result = detectOrganizationFromEmail('doctor@cityhospital.com');
      
      expect(result.name).toBe('Cityhospital');
      expect(result.type).toBe('healthcare');
      expect(result.isWorkEmail).toBe(true);
      expect(result.domain).toBe('cityhospital.com');
    });

    it('detects nonprofit organizations', () => {
      const result = detectOrganizationFromEmail('volunteer@redcross.org');
      
      expect(result.name).toBe('Redcross');
      expect(result.type).toBe('nonprofit');
      expect(result.isWorkEmail).toBe(true);
      expect(result.domain).toBe('redcross.org');
    });

    it('detects government/public health organizations', () => {
      const result = detectOrganizationFromEmail('officer@health.gov');
      
      expect(result.name).toBe('Health');
      expect(result.type).toBe('public_health');
      expect(result.isWorkEmail).toBe(true);
      expect(result.domain).toBe('health.gov');
    });

    it('defaults to SME for business domains', () => {
      const result = detectOrganizationFromEmail('employee@techcorp.com');
      
      expect(result.name).toBe('Techcorp');
      expect(result.type).toBe('sme');
      expect(result.isWorkEmail).toBe(true);
      expect(result.domain).toBe('techcorp.com');
    });

    it('handles complex domain names', () => {
      const result = detectOrganizationFromEmail('user@my-company-llc.com');
      
      expect(result.name).toBe('My Company LLC');
      expect(result.type).toBe('sme');
      expect(result.isWorkEmail).toBe(true);
    });

    it('handles invalid email addresses', () => {
      const result = detectOrganizationFromEmail('invalid-email');
      
      expect(result.name).toBe('Personal Account');
      expect(result.type).toBe('other');
      expect(result.isWorkEmail).toBe(false);
      expect(result.domain).toBe('');
    });
  });

  describe('suggestOrganizationSize', () => {
    it('suggests NGO for nonprofit domains', () => {
      expect(suggestOrganizationSize('redcross.org')).toBe('ngo');
      expect(suggestOrganizationSize('charity.foundation')).toBe('ngo');
    });

    it('suggests startup for personal email domains', () => {
      expect(suggestOrganizationSize('gmail.com')).toBe('startup');
      expect(suggestOrganizationSize('yahoo.com')).toBe('startup');
    });

    it('suggests small business for work domains', () => {
      expect(suggestOrganizationSize('techcorp.com')).toBe('small_business');
      expect(suggestOrganizationSize('businesscorp.com')).toBe('small_business');
    });
  });

  describe('suggestCountryFromDomain', () => {
    it('detects UK domains', () => {
      expect(suggestCountryFromDomain('company.co.uk')).toBe('United Kingdom');
      expect(suggestCountryFromDomain('university.ac.uk')).toBe('United Kingdom');
      expect(suggestCountryFromDomain('department.gov.uk')).toBe('United Kingdom');
    });

    it('detects Australian domains', () => {
      expect(suggestCountryFromDomain('company.com.au')).toBe('Australia');
      expect(suggestCountryFromDomain('university.edu.au')).toBe('Australia');
    });

    it('detects Canadian domains', () => {
      expect(suggestCountryFromDomain('company.ca')).toBe('Canada');
      expect(suggestCountryFromDomain('government.gov.ca')).toBe('Canada');
    });

    it('defaults to United States for unknown domains', () => {
      expect(suggestCountryFromDomain('company.com')).toBe('United States');
      expect(suggestCountryFromDomain('organization.org')).toBe('United States');
    });

    it('detects European domains', () => {
      expect(suggestCountryFromDomain('company.de')).toBe('Germany');
      expect(suggestCountryFromDomain('organization.fr')).toBe('France');
      expect(suggestCountryFromDomain('business.nl')).toBe('Netherlands');
    });
  });
});