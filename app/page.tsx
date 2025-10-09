'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaUserFriends, FaMapMarkedAlt, FaUtensils, FaChartLine } from 'react-icons/fa';
import { IoRestaurant, IoHeart, IoSparkles } from 'react-icons/io5';

const features = [
  {
    href: '/social',
    icon: FaUserFriends,
    title: 'Social Network',
    description: 'Connect with friends and see what they\'re eating',
    emoji: '👥',
    gradient: 'from-tomato-400 to-tomato-600',
    available: true,
  },
  {
    href: '/discover',
    icon: FaMapMarkedAlt,
    title: 'Discover',
    description: 'Find nearby restaurants matched to your taste',
    emoji: '🗺️',
    gradient: 'from-lime-400 to-lime-600',
    available: true,
  },
  {
    href: '/discover',
    icon: FaUtensils,
    title: 'Rate & Review',
    description: 'Build your taste profile by rating restaurants',
    emoji: '⭐',
    gradient: 'from-yellow-400 to-orange-500',
    available: true,
  },
  {
    href: '#',
    icon: FaChartLine,
    title: 'Recommendations',
    description: 'Get personalized suggestions based on your network',
    emoji: '🎯',
    gradient: 'from-purple-400 to-pink-500',
    available: false,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-warm relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 text-8xl">🍕</div>
        <div className="absolute top-40 right-20 text-6xl">🍔</div>
        <div className="absolute bottom-20 left-1/4 text-7xl">🍜</div>
        <div className="absolute bottom-40 right-1/3 text-5xl">🍱</div>
        <div className="absolute top-1/3 right-10 text-6xl">🌮</div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="inline-flex items-center gap-3 mb-4"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <IoRestaurant className="text-5xl text-tomato-500" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-tomato-600 to-tomato-400 bg-clip-text text-transparent">
              TasteTribe
            </h1>
            <IoHeart className="text-5xl text-tomato-500" />
          </motion.div>

          <motion.p
            className="text-2xl text-gray-700 mb-6 font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Discover restaurants you&apos;ll love through friends who share your taste
          </motion.p>

          <motion.div
            className="flex items-center justify-center gap-2 text-tomato-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <IoSparkles className="text-xl" />
            <span className="text-sm font-semibold">Food discovery made fun!</span>
            <IoSparkles className="text-xl" />
          </motion.div>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              {feature.available ? (
                <Link href={feature.href}>
                  <motion.div
                    className="group p-6 bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg hover:shadow-2xl transition-all border-2 border-white cursor-pointer h-full"
                    whileHover={{
                      scale: 1.05,
                      rotate: [0, -1, 1, 0],
                      transition: { duration: 0.3 },
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex flex-col items-center text-center">
                      <motion.div
                        className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-4 shadow-lg`}
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <span className="text-3xl">{feature.emoji}</span>
                      </motion.div>
                      <h3 className="font-bold text-lg mb-2 text-gray-800">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                </Link>
              ) : (
                <motion.div
                  className="p-6 bg-white/60 backdrop-blur-sm rounded-3xl shadow-md border-2 border-gray-200 h-full"
                  variants={itemVariants}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mb-4">
                      <span className="text-3xl opacity-50">{feature.emoji}</span>
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-gray-500">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed mb-2">
                      {feature.description}
                    </p>
                    <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                      Coming Soon 🎉
                    </span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <Link href="/auth/signup">
            <motion.button
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-tomato-500 to-tomato-600 text-white rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transition-all"
              whileHover={{
                scale: 1.05,
                boxShadow: '0 20px 40px rgba(255, 99, 71, 0.4)',
              }}
              whileTap={{ scale: 0.95 }}
              animate={{
                boxShadow: [
                  '0 10px 30px rgba(255, 99, 71, 0.3)',
                  '0 15px 40px rgba(255, 99, 71, 0.4)',
                  '0 10px 30px rgba(255, 99, 71, 0.3)',
                ],
              }}
              transition={{
                boxShadow: { duration: 2, repeat: Infinity },
              }}
            >
              <span>Get Started</span>
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                🚀
              </motion.span>
            </motion.button>
          </Link>

          <motion.p
            className="mt-4 text-sm text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            Join thousands of food lovers discovering their next favorite spot
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
