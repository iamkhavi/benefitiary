export function getRoleDisplayName(role: string): string {
  switch (role?.toUpperCase()) {
    case 'SEEKER':
      return 'Grant Seeker';
    case 'WRITER':
      return 'Grant Writer';
    case 'FUNDER':
      return 'Grant Funder';
    default:
      return 'User';
  }
}

export function getRoleDescription(role: string): string {
  switch (role?.toUpperCase()) {
    case 'SEEKER':
      return 'Find and apply for grants that match your organization\'s needs and goals.';
    case 'WRITER':
      return 'Connect with organizations that need grant writing services and manage your proposals.';
    case 'FUNDER':
      return 'Manage your grant opportunities and connect with qualified organizations.';
    default:
      return 'Welcome to Benefitiary';
  }
}

export function getDashboardPath(role: string): string {
  switch (role?.toUpperCase()) {
    case 'WRITER':
      return '/dashboard/writer';
    case 'FUNDER':
      return '/dashboard/funder';
    case 'SEEKER':
    default:
      return '/dashboard/seeker';
  }
}