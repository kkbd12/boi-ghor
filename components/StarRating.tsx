import React, { useState } from 'react';
import { StarIcon } from './icons';

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  starCount?: number;
  disabled?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, onRatingChange, starCount = 5, disabled = false }) => {
  const [hoverRating, setHoverRating] = useState(0);

  const handleMouseOver = (index: number) => {
    if (disabled) return;
    setHoverRating(index);
  };

  const handleMouseLeave = () => {
    if (disabled) return;
    setHoverRating(0);
  };

  const handleClick = (index: number) => {
    if (disabled) return;
    onRatingChange(index);
  };

  return (
    <div className="flex items-center" onMouseLeave={handleMouseLeave}>
      {[...Array(starCount)].map((_, i) => {
        const ratingValue = i + 1;
        return (
          <button
            key={ratingValue}
            type="button"
            className={`focus:outline-none ${disabled ? 'cursor-default' : ''}`}
            onMouseOver={() => handleMouseOver(ratingValue)}
            onClick={() => handleClick(ratingValue)}
            aria-label={`Rate ${ratingValue} out of ${starCount} stars`}
            disabled={disabled}
          >
            <StarIcon
              className={`w-8 h-8 transition-colors duration-200 ${disabled ? '' : 'cursor-pointer'} ${
                ratingValue <= (hoverRating || rating)
                  ? 'text-amber-400'
                  : 'text-stone-300 dark:text-stone-600'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
