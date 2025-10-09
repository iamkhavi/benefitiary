'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Lightbulb, 
  Target,
  Calendar,
  DollarSign,
  Users
} from 'lucide-react';

interface QuickActionsProps {
  onActionClick: (action: string, prompt: string) => void;
}

export function QuickActions({ onActionClick }: QuickActionsProps) {
  const actions = [
    {
      id: 'eligibility-check',
      title: 'Check Eligibility',
      description: 'Analyze if my organization meets all requirements',
      icon: CheckCircle,
      prompt: 'Can you do a comprehensive eligibility check for my organization against this grant? Please go through each requirement and tell me where we stand.',
      color: 'text-green-600'
    },
    {
      id: 'proposal-outline',
      title: 'Create Proposal Outline',
      description: 'Generate a structured proposal template',
      icon: FileText,
      prompt: 'Help me create a detailed proposal outline for this grant. Include all required sections and what should be covered in each.',
      color: 'text-blue-600'
    },
    {
      id: 'budget-guidance',
      title: 'Budget Guidance',
      description: 'Get help with budget planning and allocation',
      icon: DollarSign,
      prompt: 'I need help creating a budget for this grant application. What are the typical budget categories and allocation percentages for this type of grant?',
      color: 'text-yellow-600'
    },
    {
      id: 'timeline-planning',
      title: 'Timeline Planning',
      description: 'Create application and project timelines',
      icon: Calendar,
      prompt: 'Help me create a timeline for both the application process and the project implementation if we get the grant.',
      color: 'text-purple-600'
    },
    {
      id: 'gap-analysis',
      title: 'Gap Analysis',
      description: 'Identify potential weaknesses in application',
      icon: AlertTriangle,
      prompt: 'Perform a gap analysis of my organization against this grant. What are our potential weaknesses and how can we address them?',
      color: 'text-red-600'
    },
    {
      id: 'impact-metrics',
      title: 'Impact Metrics',
      description: 'Define measurable outcomes and KPIs',
      icon: Target,
      prompt: 'Help me define appropriate impact metrics and KPIs for this grant. What outcomes should we measure and how?',
      color: 'text-indigo-600'
    },
    {
      id: 'partnership-strategy',
      title: 'Partnership Strategy',
      description: 'Identify potential partners and collaborators',
      icon: Users,
      prompt: 'What types of partnerships would strengthen our application for this grant? Help me identify potential collaborators.',
      color: 'text-teal-600'
    },
    {
      id: 'innovation-ideas',
      title: 'Innovation Ideas',
      description: 'Brainstorm innovative approaches',
      icon: Lightbulb,
      prompt: 'Help me brainstorm innovative approaches and solutions that would make our proposal stand out for this grant.',
      color: 'text-orange-600'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => {
            const IconComponent = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                className="h-auto p-3 flex flex-col items-start text-left"
                onClick={() => onActionClick(action.id, action.prompt)}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <IconComponent className={`h-4 w-4 ${action.color}`} />
                  <span className="font-medium text-sm">{action.title}</span>
                </div>
                <span className="text-xs text-gray-500 text-left">
                  {action.description}
                </span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}