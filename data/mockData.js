// data/mockData.js

// restaurants with multiple menus and items
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
    ambience: ['family friendly', 'romantic'],
    rating: 4.3,
    theme: 'Cozy trattoria vibes with pasta and pizza classics',
    reviews: [
      { user: 'Sofia', rating: 5, taste: 5, location: 4, coziness: 5, comment: 'Carbonara was creamy and perfect al dente.' },
      { user: 'Marco', rating: 4, taste: 4, location: 4, coziness: 4, comment: 'Great pizza, intimate ambiance.' },
    ],
    menus: [
      {
        id: 'pizzas',
        name: 'Pizzas',
        items: [
          {
            id: 'it-margherita',
            name: 'Margarita Pizza',
            type: 'meal',
            price: 'RM30',
            cuisine: 'italian',
            description: 'Classic pizza with tomato, mozzarella, and basil.',
            tags: ['cheesy', 'popular'],
            reviews: ['Perfect crust!', 'Loved it'],
            rating: 4.3,
          },
        ],
      },
      {
        id: 'pasta',
        name: 'Pasta',
        items: [
          {
            id: 'it-carbonara',
            name: 'Spaghetti Carbonara',
            type: 'meal',
            price: 'RM28',
            cuisine: 'italian',
            description: 'Creamy egg-based sauce with parmesan and crispy beef bacon.',
            tags: ['creamy', 'rich'],
            reviews: ['Silky sauce!', 'Very satisfying'],
            rating: 4.4,
          },
        ],
      },
    ],
  },
  {
    id: 'rest-western-delight',
    name: 'Western Delight',
    location: 'Subang Jaya, Selangor',
    cuisines: ['western'],
    ambience: ['family friendly'],
    rating: 4.3,
    theme: 'Casual western diner for comfort staples',
    reviews: [
      { user: 'Hannah', rating: 4, taste: 4, location: 4, coziness: 3, comment: 'Chicken chop is hearty, good portion size.' },
      { user: 'Daniel', rating: 4, taste: 4, location: 3, coziness: 4, comment: 'Nice family spot, desserts are solid.' },
    ],
    menus: [
      {
        id: 'mains',
        name: 'Mains',
        items: [
          {
            id: 'it-chicken-chop',
            name: 'Grilled Chicken Chop',
            type: 'meal',
            price: 'RM22',
            cuisine: 'western',
            description: 'Grilled chicken with black pepper sauce, mashed potatoes, and veggies.',
            tags: ['hearty', 'savory'],
            reviews: ['Perfectly cooked!', 'Loved the sauce', 'Generous portion'],
            rating: 4.3,
          },
        ],
      },
      {
        id: 'desserts',
        name: 'Desserts',
        items: [
          {
            id: 'it-brownie',
            name: 'Chocolate Brownie',
            type: 'dessert',
            price: 'RM10',
            cuisine: 'western',
            description: 'Decadent fudgy brownie with crisp top layer.',
            tags: ['sweet', 'rich'],
            reviews: ['Delicious and gooey', 'A bit too sweet'],
            rating: 4.2,
          },
        ],
      },
    ],
  },
  {
    id: 'rest-warung-makcik',
    name: 'Warung Makcik',
    location: 'Kampung Baru, KL',
    cuisines: ['local'],
    ambience: ['takeaway', 'casual drinking'],
    rating: 4.7,
    theme: 'Authentic Malaysian kopitiam atmosphere',
    reviews: [
      { user: 'Faiz', rating: 5, taste: 5, location: 4, coziness: 4, comment: 'Sambal hits the spot, very authentic.' },
      { user: 'Intan', rating: 5, taste: 5, location: 5, coziness: 4, comment: 'Friendly staff and affordable prices.' },
    ],
    menus: [
      {
        id: 'mains',
        name: 'Mains',
        items: [
          {
            id: 'it-nasi-lemak',
            name: 'Nasi Lemak Royale',
            type: 'meal',
            price: 'RM8',
            cuisine: 'local',
            description: 'Fragrant coconut rice with spicy sambal, crispy anchovies, peanuts, and egg.',
            tags: ['spicy', 'authentic'],
            reviews: ['Best nasi lemak in KL!', 'Sambal was perfect'],
            rating: 4.7,
          },
          {
            id: 'it-aglio-olio',
            name: 'Spaghetti Aglio e Olio',
            type: 'meal',
            price: 'RM16',
            cuisine: 'italian',
            mood: ['takeaway'],
            description: 'Simple garlic and olive oil pasta with chili flakes.',
            tags: ['light', 'garlicky'],
            reviews: ['Nice surprise!', 'Affordable and tasty'],
            rating: 4.1,
          },
        ],
      },
    ],
  },
  {
    id: 'rest-brew-bean',
    name: 'Brew & Bean',
    location: 'Mont Kiara, KL',
    cuisines: ['western'],
    ambience: ['casual drinking'],
    rating: 4.1,
    theme: 'Cozy coffeehouse with signature drinks',
    reviews: [
      { user: 'Michelle', rating: 4, taste: 4, location: 4, coziness: 5, comment: 'Lovely macchiato and chill atmosphere.' },
      { user: 'Zack', rating: 3, taste: 3, location: 3, coziness: 3, comment: 'Can be crowded, but drinks are worth it.' },
    ],
    menus: [
      {
        id: 'drinks',
        name: 'Drinks',
        items: [
          {
            id: 'it-macchiato',
            name: 'Caramel Macchiato',
            type: 'drink',
            price: 'RM14',
            cuisine: 'western',
            description: 'Espresso with milk topped with caramel drizzle.',
            tags: ['sweet', 'caffeinated'],
            reviews: ['Perfect balance!', 'A bit sweet but good'],
            rating: 4.1,
          },
        ],
      },
    ],
  },
  {
    id: 'rest-le-patisserie',
    name: 'Le Patisserie',
    location: 'KLCC, KL',
    cuisines: ['french'],
    ambience: ['romantic', 'fine dining'],
    rating: 4.5,
    theme: 'Romantic patisserie and bistro elegance',
    reviews: [
      { user: 'Nadia', rating: 5, taste: 5, location: 4, coziness: 5, comment: 'Eclairs are heavenly, perfect for dates.' },
      { user: 'Pierre', rating: 4, taste: 4, location: 4, coziness: 5, comment: 'Beautiful desserts, slightly pricey.' },
    ],
    menus: [
      {
        id: 'desserts',
        name: 'Desserts',
        items: [
          {
            id: 'it-eclair',
            name: 'Eclair',
            type: 'pastry',
            price: 'RM12',
            cuisine: 'french',
            description: 'Light pastry with vanilla cream and chocolate glaze.',
            tags: ['sweet', 'fancy'],
            reviews: ['Heavenly!', 'Beautiful presentation'],
            rating: 4.5,
          },
        ],
      },
    ],
  },
  {
    id: 'rest-tea-time',
    name: 'Tea Time',
    location: 'Damansara, Selangor',
    cuisines: ['taiwanese'],
    ambience: ['casual drinking', 'takeaway'],
    rating: 4.1,
    theme: 'Trendy bubble-tea and snacks hangout',
    reviews: [
      { user: 'Jasmine', rating: 4, taste: 4, location: 4, coziness: 3, comment: 'Chewy pearls and balanced sweetness.' },
      { user: 'Leo', rating: 4, taste: 4, location: 4, coziness: 3, comment: 'Quick takeaway, consistent quality.' },
    ],
    menus: [
      {
        id: 'drinks',
        name: 'Drinks',
        items: [
          {
            id: 'it-bubble-tea',
            name: 'Bubble Tea',
            type: 'drink',
            price: 'RM12',
            cuisine: 'taiwanese',
            description: 'Sweet milk tea with tapioca pearls.',
            tags: ['sweet', 'refreshing'],
            reviews: ['Fun to drink!', 'Loved the pearls'],
            rating: 4.1,
          },
        ],
      },
    ],
  },
  {
    id: 'rest-curry-house',
    name: 'Curry House',
    location: 'Brickfields, KL',
    cuisines: ['indian'],
    ambience: ['takeaway', 'casual drinking'],
    rating: 4.2,
    theme: 'Spice-rich Indian bistro experience',
    reviews: [
      { user: 'Anand', rating: 4, taste: 4, location: 4, coziness: 3, comment: 'Samosas are crispy and flavorful.' },
      { user: 'Rupa', rating: 4, taste: 4, location: 4, coziness: 3, comment: 'Great snacks, value for money.' },
    ],
    menus: [
      {
        id: 'snacks',
        name: 'Snacks',
        items: [
          {
            id: 'it-samosa',
            name: 'Samosa',
            type: 'snacks',
            price: 'RM5',
            cuisine: 'indian',
            description: 'Fried pastry with spicy potato and peas.',
            tags: ['spicy', 'cheap'],
            reviews: ['Crispy and tasty', 'Great snack'],
            rating: 4.2,
          },
        ],
      },
    ],
  },
];

// menus into availableItems to keep compatibility
const flattenMenuItems = (restaurants) => {
  const items = [];
  for (const r of restaurants) {
    for (const menu of r.menus) {
      for (const it of menu.items) {
        items.push({
          ...it,
          restaurant: r.name,
          location: r.location,
        });
      }
    }
  }
  return items;
};

const toNumberPrice = (p) => parseInt(String(p).replace('RM', ''));

const computeRestaurantMeta = (r) => {
  const items = flattenMenuItems([r]);
  const prices = items.map(i => toNumberPrice(i.price)).filter(n => !isNaN(n));
  const averagePriceValue = prices.length ? Math.round(prices.reduce((s, n) => s + n, 0) / prices.length) : 0;
  const averagePrice = `RM${averagePriceValue}`;
  const rating = r.rating ?? (items.length ? Math.round((items.reduce((s, a) => s + (a.rating || 0), 0) / items.length) * 10) / 10 : 0);
  return {
    id: r.id,
    name: r.name,
    location: r.location,
    cuisines: r.cuisines,
    cuisine: r.cuisines[0],
    ambience: r.ambience || [],
    rating,
    averagePrice,
    averagePriceValue,
    theme: r.theme,
    topItems: items.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3).map(i => i.id),
    menus: r.menus,
    reviews: r.reviews || [],
    matchesPriceRange(range) {
      switch (range) {
        case 'RM0-RM10': return this.averagePriceValue <= 10;
        case 'RM11-RM20': return this.averagePriceValue >= 11 && this.averagePriceValue <= 20;
        case 'RM21-RM30': return this.averagePriceValue >= 21 && this.averagePriceValue <= 30;
        case 'RM31+': return this.averagePriceValue >= 31;
        default: return true;
      }
    },
  };
};

export const availableRestaurants = restaurantsCurated.map(computeRestaurantMeta);
export const availableItems = flattenMenuItems(restaurantsCurated);

export const mockFoodlists = [
  {
    id: '2',
    name: 'Sweet Treats',
    items: availableItems.filter(i => ['Chocolate Brownie', 'Mango Sticky Rice', 'Eclair'].includes(i.name)),
    collaborators: [],
  },
];

// A sample invited foodlist in notifications
export const sampleInviteFoodlist = {
  id: 'invite-1',
  name: 'Nak makan apa ni',
  items: availableItems.filter(i => ['Spicy Ramen', 'Margarita Pizza', 'Grilled Chicken Chop'].includes(i.name)),
  collaborators: [],
};

// Mock users derived from restaurant reviews
const collectMockUsers = () => {
  const names = new Set();
  for (const r of restaurantsCurated) {
    (r.reviews || []).forEach((rv) => names.add(rv.user));
  }
  return Array.from(names).map((n, idx) => ({ id: `user-${idx + 1}`, name: n }));
};

export const mockUsers = collectMockUsers();
