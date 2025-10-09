'use client';

import { motion } from 'framer-motion';
import { MapPin, Utensils, DollarSign } from 'lucide-react';

interface RestaurantCardProps {
  name: string;
  cuisine?: string;
  priceRange?: string;
  address?: string;
  imageUrl?: string;
  distance?: number;
}

export default function RestaurantCard({
  name,
  cuisine,
  priceRange,
  address,
  imageUrl,
  distance,
}: RestaurantCardProps) {
  const defaultImage = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop';

  const formatDistance = (meters?: number) => {
    if (!meters) return null;
    if (meters < 1000) return `${Math.round(meters)}m away`;
    return `${(meters / 1000).toFixed(1)}km away`;
  };

  return (
    <motion.div
      className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${imageUrl || defaultImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      </div>

      <div className="relative h-full flex flex-col justify-end p-6 md:p-8">
        {distance && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="absolute top-6 right-6 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <MapPin className="w-4 h-4 text-tomato-500" />
              {formatDistance(distance)}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight drop-shadow-lg">
            {name}
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            {cuisine && (
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
                <Utensils className="w-4 h-4 text-white" />
                <span className="text-white font-medium">{cuisine}</span>
              </div>
            )}

            {priceRange && (
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
                <DollarSign className="w-4 h-4 text-white" />
                <span className="text-white font-medium">{priceRange}</span>
              </div>
            )}
          </div>

          {address && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-white/90 text-sm md:text-base drop-shadow-md line-clamp-2"
            >
              {address}
            </motion.p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
