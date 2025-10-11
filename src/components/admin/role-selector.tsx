'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Shield, User, Edit, DollarSign } from 'lucide-react';

interface RoleSelectorProps {
  userId: string;
  currentRole: string;
  userName: string;
  onRoleChange?: (newRole: string) => void;
}

const roleConfig = {
  ADMIN: { 
    label: 'Admin', 
    color: 'bg-red-100 text-red-800', 
    icon: Shield 
  },
  SEEKER: { 
    label: 'Seeker', 
    color: 'bg-green-100 text-green-800', 
    icon: User 
  },
  WRITER: { 
    label: 'Writer', 
    color: 'bg-blue-100 text-blue-800', 
    icon: Edit 
  },
  FUNDER: { 
    label: 'Funder', 
    color: 'bg-purple-100 text-purple-800', 
    icon: DollarSign 
  }
};

export function RoleSelector({ userId, currentRole, userName, onRoleChange }: RoleSelectorProps) {
  const [isChanging, setIsChanging] = useState(false);
  const [selectedRole, setSelectedRole] = useState(currentRole);

  const handleRoleChange = async (newRole: string) => {
    if (newRole === currentRole) return;

    setIsChanging(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (data.success) {
        setSelectedRole(newRole);
        onRoleChange?.(newRole);
        
        // Show success message (you can replace with toast)
        console.log(`✅ ${userName}'s role updated to ${newRole}`);
      } else {
        throw new Error(data.error || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      // Reset to current role on error
      setSelectedRole(currentRole);
      alert(`Failed to update role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsChanging(false);
    }
  };

  const currentConfig = roleConfig[selectedRole as keyof typeof roleConfig];
  const Icon = currentConfig?.icon || User;

  return (
    <div className="flex items-center space-x-2">
      <Badge className={cn("text-xs", currentConfig?.color)}>
        <Icon className="h-3 w-3 mr-1" />
        {currentConfig?.label || selectedRole}
      </Badge>
      
      <Select
        value={selectedRole}
        onValueChange={handleRoleChange}
        disabled={isChanging}
      >
        <SelectTrigger className="w-24 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(roleConfig).map(([role, config]) => (
            <SelectItem key={role} value={role} className="text-xs">
              <div className="flex items-center space-x-2">
                <config.icon className="h-3 w-3" />
                <span>{config.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {isChanging && (
        <div className="text-xs text-gray-500">Updating...</div>
      )}
    </div>
  );
}