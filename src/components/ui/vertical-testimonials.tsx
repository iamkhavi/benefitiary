"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

const testimonials = [
  {
    id: 1,
    message: "Benefitiary helped us secure $150K in funding within our first month. The AI matching is incredibly accurate and saved us countless hours of research.",
    name: "Sarah Johnson",
    position: "CEO, TechStart Inc.",
    avatar: "SJ",
    gradient: "from-blue-500 to-purple-600"
  },
  {
    id: 2,
    message: "The proposal assistant feature is a game-changer. We've increased our success rate from 30% to 85% since using Benefitiary.",
    name: "Maria Chen",
    position: "Director, Health Forward NGO",
    avatar: "MC",
    gradient: "from-green-500 to-teal-600"
  },
  {
    id: 3,
    message: "Finally, a platform that understands our needs as a nonprofit. The personalized matching has connected us with funders we never would have found.",
    name: "David Wilson",
    position: "Founder, Community Care",
    avatar: "DW",
    gradient: "from-purple-500 to-pink-600"
  },
  {
    id: 4,
    message: "The deadline tracking feature alone is worth the subscription. We've never missed an opportunity since switching to Benefitiary.",
    name: "Lisa Rodriguez",
    position: "Grant Manager, EduTech Solutions",
    avatar: "LR",
    gradient: "from-orange-500 to-red-600"
  },
  {
    id: 5,
    message: "Incredible platform! The AI recommendations are spot-on, and the user interface is intuitive. Highly recommend for any organization seeking funding.",
    name: "James Kim",
    position: "Research Director, Innovation Labs",
    avatar: "JK",
    gradient: "from-cyan-500 to-blue-600"
  },
  {
    id: 6,
    message: "Benefitiary transformed our grant application process. We went from applying to 2-3 grants per month to 15+ with better success rates.",
    name: "Emily Parker",
    position: "Development Manager, Green Future Foundation",
    avatar: "EP",
    gradient: "from-pink-500 to-rose-600"
  },
  {
    id: 7,
    message: "The collaborative features make it easy for our team to work together on proposals. The AI writing assistant produces professional-quality content.",
    name: "Michael Torres",
    position: "Program Manager, Urban Health Initiative",
    avatar: "MT",
    gradient: "from-indigo-500 to-purple-600"
  },
  {
    id: 8,
    message: "As a small nonprofit, we couldn't afford a dedicated grant writer. Benefitiary's AI tools level the playing field for organizations like ours.",
    name: "Rachel Green",
    position: "Executive Director, Youth Empowerment Network",
    avatar: "RG",
    gradient: "from-emerald-500 to-green-600"
  }
];

const avatarColors = [
  "bg-blue-500",
  "bg-green-500", 
  "bg-purple-500",
  "bg-orange-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-red-500"
];

export function VerticalTestimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Create three columns of testimonials
  const column1 = testimonials.filter((_, index) => index % 3 === 0);
  const column2 = testimonials.filter((_, index) => index % 3 === 1);
  const column3 = testimonials.filter((_, index) => index % 3 === 2);

  // Duplicate testimonials for seamless loop
  const duplicatedColumn1 = [...column1, ...column1];
  const duplicatedColumn2 = [...column2, ...column2];
  const duplicatedColumn3 = [...column3, ...column3];

  return (
    <div className="relative h-96 overflow-hidden">
      {/* Gradient overlays for smooth edges */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-gray-50 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-gray-50 to-transparent z-10 pointer-events-none" />
      
      <div className="flex space-x-6 h-full">
        {/* Column 1 */}
        <motion.div
          className="flex flex-col space-y-6 w-1/3"
          animate={{
            y: [0, -100 * column1.length]
          }}
          transition={{
            y: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 20,
              ease: "linear"
            }
          }}
        >
          {duplicatedColumn1.map((testimonial, index) => (
            <TestimonialCard 
              key={`col1-${testimonial.id}-${index}`} 
              testimonial={testimonial}
            />
          ))}
        </motion.div>

        {/* Column 2 - Slower animation */}
        <motion.div
          className="flex flex-col space-y-6 w-1/3"
          animate={{
            y: [0, -100 * column2.length]
          }}
          transition={{
            y: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 25,
              ease: "linear"
            }
          }}
        >
          {duplicatedColumn2.map((testimonial, index) => (
            <TestimonialCard 
              key={`col2-${testimonial.id}-${index}`} 
              testimonial={testimonial}
            />
          ))}
        </motion.div>

        {/* Column 3 - Different speed */}
        <motion.div
          className="flex flex-col space-y-6 w-1/3"
          animate={{
            y: [0, -100 * column3.length]
          }}
          transition={{
            y: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 30,
              ease: "linear"
            }
          }}
        >
          {duplicatedColumn3.map((testimonial, index) => (
            <TestimonialCard 
              key={`col3-${testimonial.id}-${index}`} 
              testimonial={testimonial}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}

function TestimonialCard({ testimonial }: { 
  testimonial: typeof testimonials[0]
}) {
  return (
    <motion.div
      className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 min-h-[200px] flex flex-col justify-between"
      whileHover={{ scale: 1.02 }}
    >
      <p className="text-gray-700 text-sm leading-relaxed mb-4 flex-1">
        "{testimonial.message}"
      </p>
      
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center flex-shrink-0 shadow-md`}>
          <span className="text-white font-semibold text-sm">{testimonial.avatar}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-900 text-sm truncate">{testimonial.name}</div>
          <div className="text-gray-600 text-xs truncate">{testimonial.position}</div>
        </div>
      </div>
    </motion.div>
  );
}