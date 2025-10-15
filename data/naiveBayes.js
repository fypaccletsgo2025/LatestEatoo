// data/naiveBayes.js
// Simple Naive Bayes recommender that works with the mock restaurant data.

import { availableRestaurants, mockUserInteractions } from './mockData';

const SMOOTHING = 1;

function ensureArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function buildItemToRestaurantIndex(restaurants) {
  const map = new Map();
  restaurants.forEach((restaurant) => {
    (restaurant.menus || []).forEach((menu) => {
      (menu.items || []).forEach((item) => {
        map.set(item.id, restaurant.id);
      });
    });
  });
  return map;
}

function collectRestaurantFeatures(restaurant) {
  if (!restaurant) return [];
  const features = new Set();

  ensureArray(restaurant.cuisines).forEach((cuisine) => {
    features.add(`cuisine:${cuisine}`);
  });

  ensureArray(restaurant.ambience).forEach((ambience) => {
    features.add(`ambience:${ambience}`);
  });

  (restaurant.menus || []).forEach((menu) => {
    (menu.items || []).forEach((item) => {
      ensureArray(item.tags).forEach((tag) => {
        features.add(`tag:${tag}`);
      });
      if (item.type) {
        features.add(`type:${item.type}`);
      }
      if (item.cuisine) {
        features.add(`itemCuisine:${item.cuisine}`);
      }
    });
  });

  return Array.from(features);
}

function buildFeatureCache(restaurants) {
  const featureCache = new Map();
  const vocabulary = new Set();

  restaurants.forEach((restaurant) => {
    const features = collectRestaurantFeatures(restaurant);
    featureCache.set(restaurant.id, features);
    features.forEach((feature) => vocabulary.add(feature));
  });

  return { featureCache, vocabulary };
}

function collectPositiveRestaurantIds(interactions, itemIndex) {
  const positiveIds = new Set();
  const interactionTypes = [
    'likedRestaurantIds',
    'savedRestaurantIds',
    'visitedRestaurantIds',
  ];

  interactionTypes.forEach((key) => {
    ensureArray(interactions[key]).forEach((id) => {
      if (id) positiveIds.add(id);
    });
  });

  ensureArray(interactions.likedItemIds).forEach((itemId) => {
    const restaurantId = itemIndex.get(itemId);
    if (restaurantId) {
      positiveIds.add(restaurantId);
    }
  });

  return positiveIds;
}

function computeCounts(restaurants, featureCache, positiveIds) {
  const positiveCounts = new Map();
  const negativeCounts = new Map();

  restaurants.forEach((restaurant) => {
    const isPositive = positiveIds.has(restaurant.id);
    const targetMap = isPositive ? positiveCounts : negativeCounts;
    const features = featureCache.get(restaurant.id) || [];

    features.forEach((feature) => {
      const current = targetMap.get(feature) || 0;
      targetMap.set(feature, current + 1);
    });
  });

  return { positiveCounts, negativeCounts };
}

function toLogProbabilityMap(counts, denominator, vocabulary) {
  const logMap = new Map();
  vocabulary.forEach((feature) => {
    const count = counts.get(feature) || 0;
    const probability = (count + SMOOTHING) / denominator;
    logMap.set(feature, Math.log(probability));
  });
  return logMap;
}

function buildModel({
  restaurants,
  interactions,
}) {
  const itemIndex = buildItemToRestaurantIndex(restaurants);
  const { featureCache, vocabulary } = buildFeatureCache(restaurants);
  const positiveIds = collectPositiveRestaurantIds(interactions, itemIndex);

  const totalRestaurants = restaurants.length;
  const positiveCount = positiveIds.size;
  const negativeCount = Math.max(totalRestaurants - positiveCount, 0);
  const vocabularySize = Math.max(vocabulary.size, 1);

  const priorLiked = (positiveCount + SMOOTHING) / (totalRestaurants + SMOOTHING * 2);
  const priorNotLiked = 1 - priorLiked;

  const { positiveCounts, negativeCounts } = computeCounts(restaurants, featureCache, positiveIds);

  const positiveDenominator = positiveCount + SMOOTHING * vocabularySize;
  const negativeDenominator = negativeCount + SMOOTHING * vocabularySize;

  const logConditionalLiked = toLogProbabilityMap(positiveCounts, positiveDenominator, vocabulary);
  const logConditionalNotLiked = toLogProbabilityMap(negativeCounts, negativeDenominator, vocabulary);

  const defaultLogLiked = Math.log(SMOOTHING / positiveDenominator);
  const defaultLogNotLiked = Math.log(SMOOTHING / negativeDenominator);

  const logPriorLiked = Math.log(priorLiked);
  const logPriorNotLiked = Math.log(priorNotLiked);

  return {
    restaurants,
    positiveIds,
    featureCache,
    vocabulary,
    logPriorLiked,
    logPriorNotLiked,
    logConditionalLiked,
    logConditionalNotLiked,
    defaultLogLiked,
    defaultLogNotLiked,
  };
}

function scoreRestaurant(model, restaurant) {
  const features = model.featureCache.get(restaurant.id) || collectRestaurantFeatures(restaurant);
  let logLiked = model.logPriorLiked;
  let logNotLiked = model.logPriorNotLiked;

  features.forEach((feature) => {
    const likedContribution = model.logConditionalLiked.get(feature) ?? model.defaultLogLiked;
    const notLikedContribution = model.logConditionalNotLiked.get(feature) ?? model.defaultLogNotLiked;
    logLiked += likedContribution;
    logNotLiked += notLikedContribution;
  });

  const maxLog = Math.max(logLiked, logNotLiked);
  const likedWeight = Math.exp(logLiked - maxLog);
  const notLikedWeight = Math.exp(logNotLiked - maxLog);
  const probability = likedWeight / (likedWeight + notLikedWeight);

  return {
    probability,
    logLiked,
    logNotLiked,
    features,
  };
}

export function getNaiveBayesRecommendationsForUser(userId, options = {}) {
  const {
    restaurants = availableRestaurants,
    interactionsMap = mockUserInteractions,
    includeScores = false,
  } = options;

  const interactions = interactionsMap[userId] || {};
  const model = buildModel({ restaurants, interactions });

  const candidates = restaurants.filter((restaurant) => !model.positiveIds.has(restaurant.id));

  const scored = candidates.map((restaurant) => {
    const score = scoreRestaurant(model, restaurant);
    return {
      restaurant,
      probability: score.probability,
      ...(includeScores ? { details: score } : {}),
    };
  });

  return scored.sort((a, b) => b.probability - a.probability);
}

export function createNaiveBayesModelForUser(interactions, options = {}) {
  const restaurants = options.restaurants || availableRestaurants;
  return buildModel({ restaurants, interactions: interactions || {} });
}

