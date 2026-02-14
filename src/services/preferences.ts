export const CUISINES = [
  { id: 'american', label: 'American', icon: '🍔' },
  { id: 'mexican', label: 'Mexican', icon: '🌮' },
  { id: 'chinese', label: 'Chinese', icon: '🥡' },
  { id: 'japanese', label: 'Japanese', icon: '🍣' },
  { id: 'italian', label: 'Italian', icon: '🍕' },
  { id: 'indian', label: 'Indian', icon: '🍛' },
  { id: 'thai', label: 'Thai', icon: '🍜' },
  { id: 'korean', label: 'Korean', icon: '🥘' },
  { id: 'vietnamese', label: 'Vietnamese', icon: '🍲' },
  { id: 'mediterranean', label: 'Mediterranean', icon: '🫒' },
  { id: 'french', label: 'French', icon: '🥐' },
  { id: 'greek', label: 'Greek', icon: '🥙' },
] as const;

export const DIETARY = [
  { id: 'vegetarian', label: 'Vegetarian', icon: '🥬' },
  { id: 'vegan', label: 'Vegan', icon: '🌱' },
  { id: 'gluten-free', label: 'Gluten-Free', icon: '🌾' },
  { id: 'dairy-free', label: 'Dairy-Free', icon: '🥛' },
  { id: 'keto', label: 'Keto', icon: '🥑' },
  { id: 'paleo', label: 'Paleo', icon: '🦴' },
  { id: 'halal', label: 'Halal', icon: '☪️' },
  { id: 'kosher', label: 'Kosher', icon: '✡️' },
  { id: 'nut-free', label: 'Nut-Free', icon: '🥜' },
] as const;

export const VIBES = [
  { id: 'casual', label: 'Casual', icon: '🪑' },
  { id: 'fine-dining', label: 'Fine Dining', icon: '🍴' },
  { id: 'date-night', label: 'Date Night', icon: '💕' },
  { id: 'family', label: 'Family-Friendly', icon: '👨‍👩‍👧‍👦' },
  { id: 'late-night', label: 'Late Night', icon: '🌙' },
  { id: 'brunch', label: 'Brunch', icon: '🥞' },
  { id: 'sports-bar', label: 'Sports Bar', icon: '🏈' },
  { id: 'cozy', label: 'Cozy', icon: '🔥' },
  { id: 'romantic', label: 'Romantic', icon: '🕯️' },
  { id: 'lively', label: 'Lively', icon: '🎉' },
] as const;

export const PRICE_RANGES = [
  { id: '$', label: '$', description: 'Budget' },
  { id: '$$', label: '$$', description: 'Moderate' },
  { id: '$$$', label: '$$$', description: 'Upscale' },
  { id: '$$$$', label: '$$$$', description: 'Fancy' },
] as const;
