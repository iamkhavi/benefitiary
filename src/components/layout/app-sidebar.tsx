"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  Search, 
  FileText, 
  Target, 
  BarChart3, 
  Settings, 
  HelpCircle, 
  LogOut,
  Zap,
  CreditCard,
  MessageSquare
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface UserStats {
  applications: number;
  matches: number;
  savedMatches: number;
  analytics: number;
}

const getMainMenuItems = (stats: UserStats | null) => [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Grant Explorer",
    href: "/grants",
    icon: Search,
    badge: "New"
  },
  {
    title: "Applications",
    href: "/applications",
    icon: FileText,
    count: stats?.applications || 0
  },
  {
    title: "Matches",
    href: "/matches",
    icon: Target,
    count: stats?.matches || 0
  }
]

const getFeatureItems = (stats: UserStats | null) => [
  {
    title: "AI Assistant",
    href: "/ai-assistant",
    icon: Zap,
    badge: "Pro"
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    count: stats?.analytics || 0
  },
  {
    title: "Billing",
    href: "/billing",
    icon: CreditCard,
  },
  {
    title: "Feedback",
    href: "/feedback",
    icon: MessageSquare,
  }
]

const generalItems = [
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    title: "Help Center",
    href: "/help",
    icon: HelpCircle,
  },
  {
    title: "Log out",
    href: "/logout",
    icon: LogOut,
  }
]

export function AppSidebar() {
  const pathname = usePathname()
  const [stats, setStats] = useState<UserStats | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/user/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data.stats)
        }
      } catch (error) {
        console.error('Error fetching user stats:', error)
      }
    }

    fetchStats()
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex h-screen w-64 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <span className="font-semibold text-gray-900">Benefitiary</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6">
        {/* Main Menu */}
        <div className="px-6 mb-8">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            Main Menu
          </h3>
          <nav className="space-y-1">
            {getMainMenuItems(stats).map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-5 h-5" />
                    <span>{item.title}</span>
                  </div>
                  {item.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                  {item.count && (
                    <span className="text-xs text-gray-500">{item.count}</span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Features */}
        <div className="px-6 mb-8">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            Features
          </h3>
          <nav className="space-y-1">
            {getFeatureItems(stats).map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-5 h-5" />
                    <span>{item.title}</span>
                  </div>
                  {item.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                  {item.count && (
                    <span className="text-xs text-gray-500">{item.count}</span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* General */}
        <div className="px-6">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            General
          </h3>
          <nav className="space-y-1">
            {generalItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Upgrade Card */}
      <div className="p-6 border-t border-gray-200">
        <div className="bg-emerald-600 rounded-lg p-4 text-white">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">Upgrade Pro!</span>
          </div>
          <p className="text-xs text-emerald-100 mb-3">
            Higher productivity with better grant matching
          </p>
          <Button 
            size="sm" 
            className="w-full bg-white text-emerald-600 hover:bg-emerald-50"
          >
            Upgrade
          </Button>
        </div>
      </div>
    </div>
  )
}