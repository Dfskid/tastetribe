'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Star } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  attributes: {
    cuisine?: string;
    price?: string;
    address?: string;
    image?: string;
  };
}

interface DetailedRating {
  overall: number;
  ambience?: number;
  price?: number;
  foodQuality?: number;
  service?: number;
  tags?: string[];
}

// Fun descriptive tags users can choose
const EXPERIENCE_TAGS = [
  'Cozy', 'Romantic', 'Trendy', 'Casual', 'Fancy', 
  'Loud', 'Quiet', 'Great for dates', 'Family-friendly',
  'Instagram-worthy', 'Hidden gem', 'Tourist spot',
  'Quick service', 'Slow-paced', 'Good vibes', 'Meh vibes'
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratingsCompleted, setRatingsCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(true);
  
  // Rating state
  const [currentRating, setCurrentRating] = useState<DetailedRating>({
    overall: 0,
    tags: []
  });
  const [showDetails, setShowDetails] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  // Fetch restaurants based on search or show popular ones
  useEffect(() => {
    fetchRestaurants();
  }, []);

  async function fetchRestaurants() {
    try {
      setLoading(true);
      
      // Get user location (with permission)
      let userLat = 39.7392; // Denver default
      let userLng = -104.9903;
      
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          userLat = position.coords.latitude;
          userLng = position.coords.longitude;
        } catch (error) {
          console.log('Location access denied, using Denver default');
        }
      }

      // Fetch restaurants from database
      // In a real implementation, you'd calculate distance and sort by proximity
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('category', 'restaurant')
        .limit(15);

      if (error) throw error;
      
      setRestaurants(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      setLoading(false);
    }
  }

  async function searchRestaurants() {
    if (!searchQuery.trim()) {
      fetchRestaurants();
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('category', 'restaurant')
        .ilike('name', `%${searchQuery}%`)
        .limit(15);

      if (error) throw error;
      
      setRestaurants(data || []);
      setShowSearch(false);
      setLoading(false);
    } catch (error) {
      console.error('Error searching restaurants:', error);
      setLoading(false);
    }
  }

  async function saveRating() {
    if (currentRating.overall === 0) {
      alert('Please select an overall rating (1-5 stars)');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const currentRestaurant = restaurants[currentIndex];

      // Save rating with all details
      const { error } = await supabase
        .from('user_ratings')
        .insert({
          user_id: user.id,
          item_id: currentRestaurant.id,
          overall_rating: currentRating.overall,
          ambience_rating: currentRating.ambience,
          price_rating: currentRating.price,
          food_quality_rating: currentRating.foodQuality,
          service_rating: currentRating.service,
          tags: currentRating.tags || []
        });

      if (error) throw error;

      // Move to next restaurant
      const newRatingsCount = ratingsCompleted + 1;
      setRatingsCompleted(newRatingsCount);
      
      // Reset rating state
      setCurrentRating({ overall: 0, tags: [] });
      setShowDetails(false);

      // Check if onboarding is complete (10+ ratings)
      if (newRatingsCount >= 10) {
        // Mark onboarding as complete
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id);

        // Redirect to social feed
        router.push('/social');
      } else {
        // Move to next restaurant
        setCurrentIndex(currentIndex + 1);
      }
    } catch (error) {
      console.error('Error saving rating:', error);
      alert('Failed to save rating. Please try again.');
    }
  }

  function skipRestaurant() {
    if (currentIndex < restaurants.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setCurrentRating({ overall: 0, tags: [] });
      setShowDetails(false);
    }
  }

  function toggleTag(tag: string) {
    const currentTags = currentRating.tags || [];
    if (currentTags.includes(tag)) {
      setCurrentRating({
        ...currentRating,
        tags: currentTags.filter(t => t !== tag)
      });
    } else {
      setCurrentRating({
        ...currentRating,
        tags: [...currentTags, tag]
      });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading restaurants...</p>
        </div>
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
        <div className="text-center">
          <p className="text-xl mb-4">No restaurants found nearby.</p>
          <button
            onClick={fetchRestaurants}
            className="bg-orange-500 text-white px-6 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const currentRestaurant = restaurants[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4 pb-24">
      <div className="max-w-2xl mx-auto pt-8">
        
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Rating {ratingsCompleted + 1} of 10+
            </span>
            <span className="text-sm text-gray-500">
              {ratingsCompleted} completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(ratingsCompleted / 10) * 100}%` }}
            />
          </div>
        </div>

        {/* Search Bar (shows at start) */}
        {showSearch && ratingsCompleted === 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-2">Find restaurants you know</h2>
            <p className="text-gray-600 text-sm mb-4">
              Search for places you've been to, or rate popular Denver spots below
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchRestaurants()}
                placeholder="Search restaurants..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <button
                onClick={searchRestaurants}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition"
              >
                Search
              </button>
            </div>
          </div>
        )}

        {/* Restaurant Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          {/* Restaurant Image */}
          {currentRestaurant.attributes.image && (
            <div className="w-full h-48 bg-gray-200">
              <img
                src={currentRestaurant.attributes.image}
                alt={currentRestaurant.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6">
            {/* Restaurant Info */}
            <h2 className="text-2xl font-bold mb-2">{currentRestaurant.name}</h2>
            <div className="flex items-center gap-3 text-sm text-gray-600 mb-6">
              {currentRestaurant.attributes.cuisine && (
                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full">
                  {currentRestaurant.attributes.cuisine}
                </span>
              )}
              {currentRestaurant.attributes.price && (
                <span className="font-medium">{currentRestaurant.attributes.price}</span>
              )}
            </div>
            {currentRestaurant.attributes.address && (
              <p className="text-sm text-gray-500 mb-6">
                📍 {currentRestaurant.attributes.address}
              </p>
            )}

            {/* Overall Rating (Required) */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Overall Rating <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setCurrentRating({ ...currentRating, overall: star })}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="transform transition-transform hover:scale-110"
                  >
                    <Star
                      size={48}
                      className={
                        star <= (hoveredStar || currentRating.overall)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }
                    />
                  </button>
                ))}
              </div>
              {currentRating.overall > 0 && (
                <p className="text-center text-sm text-gray-600 mt-2">
                  {currentRating.overall === 5 && '🤩 Amazing!'}
                  {currentRating.overall === 4 && '😊 Really good!'}
                  {currentRating.overall === 3 && '😐 It was okay'}
                  {currentRating.overall === 2 && '😕 Not great'}
                  {currentRating.overall === 1 && '😞 Didn\'t like it'}
                </p>
              )}
            </div>

            {/* Optional Details Toggle */}
            {currentRating.overall > 0 && !showDetails && (
              <button
                onClick={() => setShowDetails(true)}
                className="w-full py-3 border-2 border-dashed border-orange-300 rounded-lg text-orange-600 font-medium hover:bg-orange-50 transition mb-6"
              >
                ✨ Want better recommendations? Add more details
              </button>
            )}

            {/* Detailed Ratings (Optional) */}
            {showDetails && (
              <div className="border-t pt-6 mb-6 space-y-6">
                <p className="text-sm text-gray-600 italic">
                  Optional: The more you share, the better your recommendations!
                </p>

                {/* Sub-ratings */}
                {[
                  { key: 'ambience', label: 'Ambience', emoji: '🏮' },
                  { key: 'price', label: 'Price', emoji: '💰' },
                  { key: 'foodQuality', label: 'Food Quality', emoji: '🍽️' },
                  { key: 'service', label: 'Service', emoji: '👨‍🍳' }
                ].map(({ key, label, emoji }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {emoji} {label}
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          onClick={() => setCurrentRating({ ...currentRating, [key]: value })}
                          className={`flex-1 py-2 rounded-lg border-2 transition ${
                            currentRating[key as keyof DetailedRating] === value
                              ? 'border-orange-500 bg-orange-50 text-orange-700'
                              : 'border-gray-200 hover:border-orange-300'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Experience Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    🏷️ Describe the experience
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EXPERIENCE_TAGS.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                          currentRating.tags?.includes(tag)
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={skipRestaurant}
                className="flex-1 py-3 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Skip
              </button>
              <button
                onClick={saveRating}
                disabled={currentRating.overall === 0}
                className={`flex-1 py-3 rounded-lg font-medium transition ${
                  currentRating.overall > 0
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {ratingsCompleted >= 9 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>

        {/* Encouragement Message */}
        {ratingsCompleted >= 5 && ratingsCompleted < 10 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-green-700 font-medium">
              🎉 You're doing great! {10 - ratingsCompleted} more to go!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
