// data/mockData.js

// Lightweight curated dataset used for local/offline experiences.
const restaurantsCurated = [
  {
    id: 'rest-sakura-ramen',
    name: 'Sakura Ramen',
    location: 'Bukit Bintang, KL',
    cuisines: ['japanese'],
    ambience: ['casual drinking', 'takeaway'],
    rating: 4.5,
    theme: 'Minimal, zen ramen bar and sushi counter feel',
    reviews: [
      { user: 'Aida', rating: 5, taste: 5, location: 4, coziness: 5, comment: 'Best ramen broth in town, super cozy vibe!' },
      { user: 'Rahim', rating: 4, taste: 4, location: 4, coziness: 3, comment: 'Takoyaki is great, service can be faster.' },
    ],
    menus: [
      {
        id: 'lunch',
        name: 'Lunch',
        items: [
          {
            id: 'it-spicy-ramen',
            name: 'Spicy Ramen',
            type: 'meal',
            price: 'RM25',
            cuisine: 'japanese',
            description: 'Savory noodle soup with tender pork and soft-boiled egg.',
            tags: ['spicy', 'popular'],
            reviews: ['Loved the noodles!', 'Could be spicier', 'Great for lunch'],
            rating: 4.5,
          },
          {
            id: 'it-takoyaki',
            name: 'Takoyaki',
            type: 'snacks',
            price: 'RM10',
            cuisine: 'japanese',
            description: 'Fried octopus balls with takoyaki sauce and mayo.',
            tags: ['savory', 'streetfood'],
            reviews: ['So tasty!', 'Loved the sauce'],
            rating: 4.2,
          },
          {
            id: 'it-sakura-hamburger',
            name: 'Sakura Hamburger',
            type: 'meal',
            price: 'RM19',
            cuisine: 'western',
            description: 'Juicy beef patty with teriyaki glaze in a soft bun.',
            tags: ['fusion', 'beef'],
            reviews: ['Unexpectedly good!', 'Teriyaki twist is nice'],
            rating: 4.0,
          },
        ],
      },
      {
        id: 'drinks',
        name: 'Drinks',
        items: [
          {
            id: 'it-iced-matcha',
            name: 'Iced Matcha Latte',
            type: 'drink',
            price: 'RM12',
            cuisine: 'japanese',
            mood: ['casual drinking', 'takeaway'],
            description: 'Smooth blend of premium matcha powder and milk served over ice.',
            tags: ['refreshing', 'sweet'],
            reviews: ['Perfectly chilled!', 'Too sweet for me'],
            rating: 3.8,
          },
        ],
      },
    ],
  },
  {
    id: 'rest-bangkok-spice',
    name: 'Bangkok Spice',
    location: 'Damansara, Selangor',
    cuisines: ['thai'],
    ambience: ['family friendly', 'casual drinking', 'romantic'],
    rating: 4.6,
    theme: 'Vibrant Thai street-food energy and aromas',
    reviews: [
      { user: 'Lily', rating: 5, taste: 5, location: 4, coziness: 4, comment: 'Authentic flavors, green curry is a must!' },
      { user: 'Ken', rating: 4, taste: 4, location: 4, coziness: 4, comment: 'Mango sticky rice was delicious and fresh.' },
    ],
    menus: [
      {
        id: 'mains',
        name: 'Mains',
        items: [
          {
            id: 'it-thai-green-curry',
            name: 'Thai Green Curry',
            type: 'meal',
            price: 'RM20',
            cuisine: 'thai',
            description: 'Creamy green curry with tender chicken and bamboo shoots.',
            tags: ['spicy', 'aromatic'],
            reviews: ['Authentic taste!', 'Rich and flavorful'],
            rating: 4.6,
          },
        ],
      },
      {
        id: 'desserts',
        name: 'Desserts',
        items: [
          {
            id: 'it-mango-sticky-rice',
            name: 'Mango Sticky Rice',
            type: 'dessert',
            price: 'RM15',
            cuisine: 'thai',
            description: 'Sweet mango paired with sticky rice and creamy coconut milk.',
            tags: ['sweet', 'fruity'],
            reviews: ['So refreshing!', 'Loved the coconut flavor'],
            rating: 4.4,
          },
        ],
      },
    ],
  },
  {
    id: 'rest-pizza-house',
    name: 'Pizza House',
    location: 'Petaling Jaya, Selangor',
    cuisines: ['italian'],
    ambience: ['family friendly', 'takeaway'],
    rating: 4.3,
    theme: 'Classic Italian trattoria vibes with wood-fire ovens',
    reviews: [
      { user: 'Daniel', rating: 4, taste: 4, location: 3, coziness: 4, comment: 'Thin crust is perfect, sauce is rich.' },
      { user: 'Megan', rating: 5, taste: 5, location: 4, coziness: 5, comment: 'The margarita pizza is perfection.' },
    ],
    menus: [
      {
        id: 'pizzas',
        name: 'Pizzas',
        items: [
          {
            id: 'it-margherita',
            name: 'Margherita Pizza',
            type: 'meal',
            price: 'RM28',
            cuisine: 'italian',
            description: 'Classic tomato base, mozzarella, fresh basil.',
            tags: ['vegetarian', 'classic'],
            rating: 4.4,
          },
          {
            id: 'it-pepperoni',
            name: 'Pepperoni Pizza',
            type: 'meal',
            price: 'RM32',
            cuisine: 'italian',
            description: 'Topped with premium beef pepperoni and mozzarella.',
            tags: ['popular', 'beef'],
            rating: 4.5,
          },
        ],
      },
      {
        id: 'desserts',
        name: 'Desserts',
        items: [
          {
            id: 'it-tiramisu',
            name: 'Tiramisu',
            type: 'dessert',
            price: 'RM18',
            cuisine: 'italian',
            description: 'Creamy espresso-soaked ladyfingers with mascarpone.',
            tags: ['coffee', 'sweet'],
            rating: 4.2,
          },
        ],
      },
    ],
  },
  {
    id: 'rest-espresso-bar',
    name: 'Espurrsso Bar',
    location: 'Mont Kiara, KL',
    cuisines: ['cafe'],
    ambience: ['cat cafe', 'cozy', 'family friendly'],
    rating: 4.7,
    theme: 'Cat cafe with specialty espresso and cuddly resident cats.',
    reviews: [
      { user: 'Mia', rating: 5, taste: 4, location: 4, coziness: 5, comment: 'Cats everywhere! Coffee is solid too.' },
      { user: 'Aaron', rating: 4, taste: 4, location: 5, coziness: 4, comment: 'Great latte art and friendly staff.' },
    ],
    menus: [
      {
        id: 'coffee',
        name: 'Coffee',
        items: [
          {
            id: 'it-flat-white',
            name: 'Flat White',
            type: 'drink',
            price: 'RM12',
            cuisine: 'australian',
            description: 'Double shot espresso with velvety steamed milk.',
            tags: ['coffee', 'smooth'],
            rating: 4.6,
          },
          {
            id: 'it-caramel-latte',
            name: 'Caramel Latte',
            type: 'drink',
            price: 'RM14',
            cuisine: 'western',
            description: 'Espresso, steamed milk, caramel drizzle.',
            tags: ['sweet', 'popular'],
            rating: 4.3,
          },
        ],
      },
      {
        id: 'pastries',
        name: 'Pastries',
        items: [
          {
            id: 'it-macaron-box',
            name: 'Macaron Box',
            type: 'dessert',
            price: 'RM16',
            cuisine: 'french',
            description: 'Box of four assorted macarons baked in-house.',
            tags: ['sweet', 'colourful'],
            rating: 4.1,
          },
        ],
      },
    ],
  },
];

const flattenMenuItems = (restaurants) => {
  const items = [];
  restaurants.forEach((restaurant) => {
    ensureArray(restaurant.menus).forEach((menu) => {
      ensureArray(menu.items).forEach((item) => {
        items.push({
          ...item,
          restaurant: restaurant.name,
          restaurantId: restaurant.id,
          location: restaurant.location,
        });
      });
    });
  });
  return items;
};

const ensureArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const toNumberPrice = (price) => parseInt(String(price).replace(/[^0-9]/g, ''), 10);

const computeRestaurantMeta = (restaurant) => {
  const items = flattenMenuItems([restaurant]);
  const priceValues = items.map((item) => toNumberPrice(item.price)).filter((n) => Number.isFinite(n));
  const averagePriceValue = priceValues.length
    ? Math.round(priceValues.reduce((sum, value) => sum + value, 0) / priceValues.length)
    : 0;
  const averagePrice = averagePriceValue ? `RM${averagePriceValue}` : 'RM0';
  const rating =
    restaurant.rating ??
    (items.length ? Math.round((items.reduce((sum, item) => sum + (item.rating || 0), 0) / items.length) * 10) / 10 : 0);

  return {
    id: restaurant.id,
    name: restaurant.name,
    location: restaurant.location,
    cuisines: restaurant.cuisines,
    cuisine: restaurant.cuisines[0],
    ambience: restaurant.ambience || [],
    rating,
    averagePrice,
    averagePriceValue,
    theme: restaurant.theme,
    topItems: items
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3)
      .map((item) => item.id),
    menus: restaurant.menus,
    reviews: restaurant.reviews || [],
    matchesPriceRange(range) {
      switch (range) {
        case 'RM0-RM10':
          return this.averagePriceValue <= 10;
        case 'RM11-RM20':
          return this.averagePriceValue >= 11 && this.averagePriceValue <= 20;
        case 'RM21-RM30':
          return this.averagePriceValue >= 21 && this.averagePriceValue <= 30;
        case 'RM31+':
          return this.averagePriceValue >= 31;
        default:
          return true;
      }
    },
  };
};

export const availableRestaurants = restaurantsCurated.map(computeRestaurantMeta);
export const availableItems = flattenMenuItems(restaurantsCurated);

export const mockFoodlists = [
  {
    id: 'fl-1',
    name: 'Sweet Treats',
    items: availableItems.filter((item) => ['Mango Sticky Rice', 'Tiramisu', 'Macaron Box'].includes(item.name)),
    collaborators: [],
  },
];

export const sampleInviteFoodlist = {
  id: 'invite-1',
  name: 'Nak makan apa ni',
  items: availableItems.filter((item) => ['Spicy Ramen', 'Margherita Pizza', 'Flat White'].includes(item.name)),
  collaborators: [],
};

const collectMockUsers = () => {
  const names = new Set();
  restaurantsCurated.forEach((restaurant) => {
    ensureArray(restaurant.reviews).forEach((review) => names.add(review.user));
  });
  return Array.from(names).map((name, index) => ({ id: `user-${index + 1}`, name }));
};

export const mockUsers = collectMockUsers();
