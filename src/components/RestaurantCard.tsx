import React from 'react';
import { MapPin, Star, DollarSign, Clock, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RestaurantData } from '@/services/searchService';

interface RestaurantCardProps {
  restaurant: RestaurantData;
  onGetDirections?: () => void;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, onGetDirections }) => {
  const renderPriceLevel = (level?: string) => {
    if (!level) return null;
    const count = level.length;
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <DollarSign
            key={i}
            size={14}
            className={i < count ? 'text-green-600' : 'text-gray-300'}
          />
        ))}
      </div>
    );
  };

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="bg-gradient-to-r from-fud-peach to-fud-yellow">
        <CardTitle className="text-2xl text-fud-brown">{restaurant.name}</CardTitle>
        <CardDescription className="flex items-center gap-2 text-fud-brown/80">
          <MapPin size={16} />
          <span>{restaurant.address}</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        {/* Rating & Price */}
        <div className="flex items-center gap-4">
          {restaurant.rating && (
            <div className="flex items-center gap-1">
              <Star size={18} className="fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{restaurant.rating}</span>
            </div>
          )}
          {renderPriceLevel(restaurant.priceLevel)}
          {restaurant.hours && (
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <Clock size={14} />
              <span>{restaurant.hours}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {restaurant.description && (
          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 italic border-l-4 border-fud-teal pl-4">
            {restaurant.description}
          </p>
        )}

        {/* Recommended Dishes */}
        {restaurant.popularDishes && restaurant.popularDishes.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2 text-fud-teal dark:text-fud-peach">
              🍽️ You should order:
            </h4>
            <ul className="space-y-2">
              {restaurant.popularDishes.slice(0, 3).map((dish, index) => (
                <li
                  key={index}
                  className="text-sm bg-fud-lightGreen/20 dark:bg-fud-brown/20 p-2 rounded-lg"
                >
                  <span className="font-medium">{index + 1}.</span> {dish}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Top Reviews */}
        {restaurant.reviews && restaurant.reviews.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2 text-sm text-gray-600 dark:text-gray-400">
              What people are saying:
            </h4>
            <div className="space-y-2">
              {restaurant.reviews.slice(0, 2).map((review, index) => (
                <div
                  key={index}
                  className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{review.author}</span>
                    <div className="flex items-center gap-1">
                      <Star size={12} className="fill-yellow-400 text-yellow-400" />
                      <span>{review.rating}</span>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">"{review.text}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={onGetDirections}
            className="flex-1 bg-fud-teal dark:bg-fud-peach hover:bg-fud-teal/90"
          >
            <MapPin size={16} className="mr-2" />
            Get Directions
          </Button>
          {restaurant.website && (
            <Button
              variant="outline"
              onClick={() => window.open(restaurant.website, '_blank')}
            >
              <ExternalLink size={16} />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RestaurantCard;
