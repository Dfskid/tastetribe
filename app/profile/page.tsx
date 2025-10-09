'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { Trophy, TrendingUp, Star, Award, ChefHat, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fetchTasteProfile, type TasteProfileData } from '@/lib/services/taste-profile';

export default function TasteProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [profileData, setProfileData] = useState<TasteProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const data = await fetchTasteProfile(user.id);
      setProfileData(data);
    } catch (err) {
      console.error('Error loading taste profile:', err);
      setError('Failed to load your taste profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-tomato-500 animate-spin mx-auto" />
          <p className="text-gray-600 font-medium">Loading your taste profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <ChefHat className="w-16 h-16 text-tomato-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={loadProfile}
            className="px-6 py-3 bg-tomato-500 text-white rounded-full font-semibold hover:bg-tomato-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profileData || profileData.totalRatings === 0) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <ChefHat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Start Building Your Taste Profile
          </h2>
          <p className="text-gray-600 mb-6">
            Rate some restaurants to see personalized insights about your dining preferences!
          </p>
          <button
            onClick={() => router.push('/discover')}
            className="px-6 py-3 bg-tomato-500 text-white rounded-full font-semibold hover:bg-tomato-600 transition-colors"
          >
            Discover Restaurants
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full shadow-lg mb-4">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-tomato-600 to-amber-600 bg-clip-text text-transparent">
            Your Taste Profile
          </h1>
          <p className="text-lg text-gray-700">
            Discover insights from your <span className="font-bold text-tomato-600">{profileData.totalRatings}</span> restaurant ratings
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={<Star className="w-6 h-6" />}
            label="Average Rating"
            value={profileData.averageRating.toFixed(1)}
            subtitle="stars"
            color="amber"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Total Ratings"
            value={profileData.totalRatings.toString()}
            subtitle="restaurants rated"
            color="tomato"
          />
          <StatCard
            icon={<Award className="w-6 h-6" />}
            label="Cuisines Tried"
            value={profileData.cuisineStats.length.toString()}
            subtitle="different types"
            color="emerald"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ChartCard title="Favorite Cuisines" description="Your most frequently rated cuisine types">
            {profileData.cuisineStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={profileData.cuisineStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="cuisine"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="#FF6347" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState />
            )}
          </ChartCard>

          <ChartCard title="Rating Breakdown" description="Average ratings across key categories">
            {profileData.categoryRatings.some(c => c.average > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={profileData.categoryRatings}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 5]}
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                  />
                  <Radar
                    name="Average Rating"
                    dataKey="average"
                    stroke="#FF6347"
                    fill="#FF6347"
                    fillOpacity={0.6}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState message="Rate restaurants and tag categories to see your preferences!" />
            )}
          </ChartCard>
        </div>

        <ChartCard
          title="Top 5 Vouched-For Restaurants"
          description="Your highest-rated dining experiences"
        >
          {profileData.topRestaurants.length > 0 ? (
            <div className="space-y-3">
              {profileData.topRestaurants.map((restaurant, index) => (
                <motion.div
                  key={restaurant.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-4 bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 hover:border-tomato-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => router.push(`/restaurant/${restaurant.id}`)}
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                    #{index + 1}
                  </div>

                  {restaurant.imageUrl && (
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-200">
                      <img
                        src={restaurant.imageUrl}
                        alt={restaurant.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-lg truncate">
                      {restaurant.name}
                    </h3>
                    {restaurant.cuisine && (
                      <p className="text-sm text-gray-600">{restaurant.cuisine}</p>
                    )}
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <div className="flex items-center gap-1 text-amber-500 font-bold text-lg">
                      <Star className="w-5 h-5 fill-amber-400" />
                      {restaurant.rating.toFixed(1)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {restaurant.totalRatings} {restaurant.totalRatings === 1 ? 'rating' : 'ratings'}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyChartState message="Keep rating restaurants to build your top favorites list!" />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  color: 'amber' | 'tomato' | 'emerald';
}

function StatCard({ icon, label, value, subtitle, color }: StatCardProps) {
  const colorClasses = {
    amber: 'from-amber-400 to-amber-500 text-amber-600',
    tomato: 'from-tomato-400 to-tomato-500 text-tomato-600',
    emerald: 'from-emerald-400 to-emerald-500 text-emerald-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]} text-white shadow-md`}>
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm text-gray-600 font-medium">{label}</p>
        <p className={`text-4xl font-bold ${colorClasses[color].split(' ')[2]}`}>
          {value}
        </p>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    </motion.div>
  );
}

interface ChartCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function ChartCard({ title, description, children }: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">{title}</h2>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      {children}
    </motion.div>
  );
}

function EmptyChartState({ message }: { message?: string }) {
  return (
    <div className="h-[300px] flex items-center justify-center">
      <div className="text-center text-gray-400 space-y-2">
        <ChefHat className="w-12 h-12 mx-auto opacity-50" />
        <p className="text-sm">{message || 'No data available yet'}</p>
      </div>
    </div>
  );
}
