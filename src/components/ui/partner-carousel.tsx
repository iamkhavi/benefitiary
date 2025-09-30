"use client";

import { motion } from "motion/react";

// Logo Components
const GatesFoundationLogo = () => (
  <div className="flex items-center space-x-2">
    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
      <span className="text-white font-bold text-sm">G</span>
    </div>
    <span className="font-semibold text-gray-700">Gates Foundation</span>
  </div>
);

const NSFLogo = () => (
  <div className="flex items-center space-x-2">
    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
      <span className="text-white font-bold text-xs">NSF</span>
    </div>
    <span className="font-semibold text-gray-700">National Science Foundation</span>
  </div>
);

const FordFoundationLogo = () => (
  <div className="flex items-center space-x-2">
    <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center">
      <span className="text-white font-bold text-sm">F</span>
    </div>
    <span className="font-semibold text-gray-700">Ford Foundation</span>
  </div>
);

const RockefellerLogo = () => (
  <div className="flex items-center space-x-2">
    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
      <span className="text-white font-bold text-sm">R</span>
    </div>
    <span className="font-semibold text-gray-700">Rockefeller Foundation</span>
  </div>
);

const EuropeanCommissionLogo = () => (
  <div className="flex items-center space-x-2">
    <div className="w-8 h-8 bg-blue-700 rounded flex items-center justify-center">
      <div className="w-4 h-4 border border-yellow-400 rounded-full flex items-center justify-center">
        <div className="w-1 h-1 bg-yellow-400 rounded-full"></div>
      </div>
    </div>
    <span className="font-semibold text-gray-700">European Commission</span>
  </div>
);

const WHOLogo = () => (
  <div className="flex items-center space-x-2">
    <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center">
      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    </div>
    <span className="font-semibold text-gray-700">WHO</span>
  </div>
);

const UNICEFLogo = () => (
  <div className="flex items-center space-x-2">
    <div className="w-8 h-8 bg-sky-600 rounded flex items-center justify-center">
      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    </div>
    <span className="font-semibold text-gray-700">UNICEF</span>
  </div>
);

const MacArthurLogo = () => (
  <div className="flex items-center space-x-2">
    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
      <span className="text-white font-bold text-sm">M</span>
    </div>
    <span className="font-semibold text-gray-700">MacArthur Foundation</span>
  </div>
);

const WellcomeLogo = () => (
  <div className="flex items-center space-x-2">
    <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
      <span className="text-white font-bold text-sm">W</span>
    </div>
    <span className="font-semibold text-gray-700">Wellcome Trust</span>
  </div>
);

const RWJFLogo = () => (
  <div className="flex items-center space-x-2">
    <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
      <span className="text-white font-bold text-xs">RWJF</span>
    </div>
    <span className="font-semibold text-gray-700">Robert Wood Johnson Foundation</span>
  </div>
);

const partners = [
  { name: "Gates Foundation", component: GatesFoundationLogo },
  { name: "National Science Foundation", component: NSFLogo },
  { name: "Ford Foundation", component: FordFoundationLogo },
  { name: "Rockefeller Foundation", component: RockefellerLogo },
  { name: "European Commission", component: EuropeanCommissionLogo },
  { name: "World Health Organization", component: WHOLogo },
  { name: "UNICEF", component: UNICEFLogo },
  { name: "MacArthur Foundation", component: MacArthurLogo },
  { name: "Wellcome Trust", component: WellcomeLogo },
  { name: "Robert Wood Johnson Foundation", component: RWJFLogo }
];

export function PartnerCarousel() {
  // Duplicate the partners array to create seamless loop
  const duplicatedPartners = [...partners, ...partners];

  return (
    <div className="relative overflow-hidden">
      <motion.div
        className="flex items-center space-x-12"
        animate={{
          x: [0, -100 * partners.length]
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 30,
            ease: "linear"
          }
        }}
        style={{
          width: `${200 * duplicatedPartners.length}px`
        }}
      >
        {duplicatedPartners.map((partner, index) => {
          const LogoComponent = partner.component;
          return (
            <motion.div
              key={`${partner.name}-${index}`}
              className="flex-shrink-0 flex items-center justify-center transition-all duration-300 opacity-70 hover:opacity-100 px-4"
              whileHover={{ scale: 1.05 }}
            >
              <LogoComponent />
            </motion.div>
          );
        })}
      </motion.div>
      
      {/* Gradient overlays for smooth edges */}
      <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-gray-50 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none" />
    </div>
  );
}

// Alternative static grid version for better performance if needed
export function PartnerGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-center justify-items-center">
      {partners.slice(0, 6).map((partner, index) => {
        const LogoComponent = partner.component;
        return (
          <motion.div
            key={partner.name}
            className="flex items-center justify-center transition-all duration-300 opacity-70 hover:opacity-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.7, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05, opacity: 1 }}
          >
            <LogoComponent />
          </motion.div>
        );
      })}
    </div>
  );
}