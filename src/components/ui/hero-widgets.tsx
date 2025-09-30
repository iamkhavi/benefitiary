"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import SearchIcon from '@mui/icons-material/Search';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DescriptionIcon from '@mui/icons-material/Description';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import PsychologyIcon from '@mui/icons-material/Psychology';

// Grant Matching Widget
export function GrantMatchingWidget() {
  const [currentMatch, setCurrentMatch] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const grants = [
    {
      title: "Innovation Catalyst Grant 2024",
      funder: "National Science Foundation",
      amount: "$50K - $250K",
      match: 98,
      category: "Technology & Innovation",
      deadline: "Mar 15, 2024",
      color: "bg-emerald-500"
    },
    {
      title: "Global Health Innovation Fund",
      funder: "Gates Foundation",
      amount: "$25K - $100K",
      match: 94,
      category: "Healthcare & Public Health",
      deadline: "Apr 1, 2024",
      color: "bg-blue-500"
    },
    {
      title: "SME Growth Accelerator",
      funder: "European Commission",
      amount: "$75K - $500K",
      match: 91,
      category: "Business Development",
      deadline: "May 20, 2024",
      color: "bg-purple-500"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsSearching(true);
      setTimeout(() => {
        setCurrentMatch((prev) => (prev + 1) % grants.length);
        setIsSearching(false);
      }, 1000);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 w-80">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
            <GpsFixedIcon sx={{ fontSize: 16, color: '#FF7A51' }} />
          </div>
          <span className="font-medium text-gray-900 text-sm">Grant Matching</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-600 font-medium">Live</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <SearchIcon sx={{ 
          position: 'absolute', 
          left: 10, 
          top: '50%', 
          transform: 'translateY(-50%)', 
          fontSize: 16, 
          color: '#9CA3AF' 
        }} />
        <input 
          type="text" 
          placeholder="Healthcare innovation startup..."
          className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          readOnly
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Grant Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMatch}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3 }}
          className="border border-gray-200 rounded-lg p-3 mb-3"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-medium text-gray-900 text-xs leading-tight">{grants[currentMatch].title}</h3>
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium text-white ${grants[currentMatch].color}`}>
                  {grants[currentMatch].match}%
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-1">{grants[currentMatch].funder}</p>
              <p className="text-xs text-gray-500">{grants[currentMatch].category}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center">
              <AccessTimeIcon sx={{ fontSize: 12, marginRight: 0.5 }} />
              {grants[currentMatch].deadline}
            </span>
            <span className="flex items-center">
              <EmojiEventsIcon sx={{ fontSize: 12, marginRight: 0.5 }} />
              {grants[currentMatch].amount}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Match Progress */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-700">Matching Progress</span>
          <span className="text-xs text-gray-500">3 of 847</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <motion.div 
            className="bg-primary h-1.5 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "35%" }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

// AI Writing Assistant Widget
export function AIWritingWidget() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [displayText, setDisplayText] = useState("");

  const steps = [
    {
      title: "Analyzing Requirements",
      description: "Understanding grant criteria",
      icon: PsychologyIcon,
      color: "#3B82F6"
    },
    {
      title: "Generating Content",
      description: "Creating compelling sections",
      icon: AutoAwesomeIcon,
      color: "#8B5CF6"
    },
    {
      title: "Optimizing Language",
      description: "Enhancing persuasiveness",
      icon: DescriptionIcon,
      color: "#10B981"
    }
  ];

  const sampleText = "Our innovative healthcare platform leverages artificial intelligence to improve patient outcomes in underserved communities. Through advanced data analytics and machine learning algorithms, we have demonstrated a 40% reduction in diagnostic errors and a 25% improvement in treatment efficiency...";

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 3000);

    return () => clearInterval(stepInterval);
  }, []);

  useEffect(() => {
    if (currentStep === 1) {
      setIsTyping(true);
      setDisplayText("");
      let index = 0;
      const typingInterval = setInterval(() => {
        if (index < sampleText.length) {
          setDisplayText(sampleText.slice(0, index + 1));
          index++;
        } else {
          setIsTyping(false);
          clearInterval(typingInterval);
        }
      }, 30);

      return () => clearInterval(typingInterval);
    }
  }, [currentStep]);

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 w-80">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <AutoAwesomeIcon sx={{ fontSize: 16, color: 'white' }} />
          </div>
          <span className="font-medium text-gray-900 text-sm">AI Writing Assistant</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-purple-600 font-medium">Active</span>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="space-y-3 mb-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <motion.div
              key={index}
              className={`flex items-center space-x-2 p-2 rounded-lg transition-all ${
                isActive ? 'bg-gray-50' : ''
              }`}
              animate={{
                scale: isActive ? 1.01 : 1,
                opacity: isActive ? 1 : 0.7
              }}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                isCompleted ? 'bg-green-100' : isActive ? 'bg-purple-100' : 'bg-gray-100'
              }`}>
                {isCompleted ? (
                  <CheckCircleIcon sx={{ fontSize: 14, color: '#10B981' }} />
                ) : (
                  <Icon sx={{ fontSize: 14, color: isActive ? step.color : '#9CA3AF' }} />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-xs text-gray-900">{step.title}</div>
                <div className="text-xs text-gray-500">{step.description}</div>
              </div>
              {isActive && (
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Generated Content Preview */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-700">Generated Content</span>
          <span className="text-xs text-gray-500">Executive Summary</span>
        </div>
        <div className="bg-white rounded-lg p-2 min-h-[80px] border border-gray-200">
          <p className="text-xs text-gray-700 leading-relaxed">
            {displayText}
            {isTyping && <span className="animate-pulse">|</span>}
          </p>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-1">
            <TrendingUpIcon sx={{ fontSize: 12, color: '#10B981' }} />
            <span className="text-xs text-green-600 font-medium">94% Quality</span>
          </div>
          <span className="text-xs text-gray-500">{displayText.length}/2.5K</span>
        </div>
      </div>
    </div>
  );
}

