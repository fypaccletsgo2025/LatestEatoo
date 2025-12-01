// ExploreHomeScreen.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

// dY`% uses your frontend Appwrite client (place at project root: appwrite.ts/js)
import { db, DB_ID, COL } from '../appwrite';
import { Query } from 'appwrite';
import { getNaiveBayesRecommendationsForCurrentUser } from '../data/NaiveBayes';
import {
  arePreferenceSelectionsEqual,
  replacePreferenceSelections,
  usePreferenceSelections,
} from '../state/preferenceSelectionsStore';
import { getLikedItemIds, getSavedRestaurantIds } from '../state/libraryStore';
import { onFoodlistsChange } from '../state/foodlistsStore';

const EMPTY_SET = new Set();

export default function ExploreHomeScreen({
  onOpenDrawer,
  onStartQuestionnaire,
  externalSelections,
  onScrollDirectionChange,
}) {
  const navigation = useNavigation();

  // -------- live data --------
  const [availableRestaurants, setAvailableRestaurants] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [bayesScores, setBayesScores] = useState(new Map());
  const [foodlistVersion, setFoodlistVersion] = useState(0);

  // store click *events* instead of raw counts: Map<restaurantId, number[] of timestamps>
  const [clickEvents, setClickEvents] = useState(new Map());

  // -------- UI state --------
  const [sortBy, setSortBy] = useState('relevance');
  const [search, setSearch] = useState('');
  const scrollOffsetRef = useRef(0);
  const lastDirectionRef = useRef('down');
  const reportScrollDirection = useCallback(
    (direction) => {
      if (typeof onScrollDirectionChange !== 'function') {
        return;
      }
      if (lastDirectionRef.current === direction) {
        return;
      }
      lastDirectionRef.current = direction;
      onScrollDirectionChange(direction);
    },
    [onScrollDirectionChange],
  );

  useEffect(() => {
    reportScrollDirection('down');
  }, [reportScrollDirection]);

  useEffect(() => {
    const unsubscribe = onFoodlistsChange(() => {
      setFoodlistVersion((prev) => prev + 1);
    });
    return unsubscribe;
  }, []);

  const handleScroll = useCallback(
    (event) => {
      const y = event?.nativeEvent?.contentOffset?.y ?? 0;
      const delta = y - scrollOffsetRef.current;
      scrollOffsetRef.current = y;
      if (y <= 0) {
        reportScrollDirection('down');
        return;
      }
      if (Math.abs(delta) < 8) {
        return;
      }
      reportScrollDirection(delta > 0 ? 'up' : 'down');
    },
    [reportScrollDirection],
  );

  // ---------- helpers ----------
  const toRM = (n) => (n == null || Number.isNaN(Number(n)) ? 'RM0' : `RM${Number(n)}`);
  const parsePriceValue = (value) => {
    const numeric = Number(String(value).replace(/[^0-9.]/g, ''));
    return Number.isFinite(numeric) ? numeric : null;
  };
  const matchesPriceRange = (priceValue, range) => {
    if (priceValue == null) return false;
    const text = String(range || '').toUpperCase();
    if (text === 'RM0-RM10') return priceValue <= 10;
    if (text === 'RM11-RM20') return priceValue >= 11 && priceValue <= 20;
    if (text === 'RM21-RM30') return priceValue >= 21 && priceValue <= 30;
    if (text === 'RM31+') return priceValue >= 31;
    const nums = String(range || '').match(/(\d+(\.\d+)?)/g)?.map((n) => Number(n)) || [];
    if (!nums.length) return true;
    const min = nums[0];
    const max = nums[1] ?? Number.POSITIVE_INFINITY;
    return priceValue >= min && priceValue <= max;
  };
  const sum = (arr) => arr.reduce((s, n) => s + n, 0);

  // --- % helpers (for the match badge) ---
  const clamp01 = (x) => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
  const pct = (x) => Math.round(clamp01(x) * 100);
  const coerceNumber = (val) => {
    if (Number.isFinite(val)) return val;
    if (typeof val === 'string') {
      const cleaned = val.match(/-?\d+(\.\d+)?/)?.[0];
      if (cleaned != null) {
        const parsed = Number(cleaned);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
    return null;
  };

  const likesFunctionAvailable = typeof getLikedItemIds === 'function';
  const savesFunctionAvailable = typeof getSavedRestaurantIds === 'function';

  const rawLikedItemIds = likesFunctionAvailable ? getLikedItemIds() : [];
  const cleanedLikedItemIds = Array.isArray(rawLikedItemIds)
    ? rawLikedItemIds.filter(Boolean)
    : [];
  const sortedLikedItemIds = cleanedLikedItemIds.slice().sort();
  const likedItemsSerialized =
    sortedLikedItemIds.length > 0 ? JSON.stringify(sortedLikedItemIds) : '';

  const likedItemsSet = useMemo(() => {
    if (!likedItemsSerialized) return EMPTY_SET;
    try {
      return new Set(JSON.parse(likedItemsSerialized));
    } catch (_err) {
      return EMPTY_SET;
    }
  }, [likedItemsSerialized]);

  const rawSavedRestaurantIds = savesFunctionAvailable ? getSavedRestaurantIds() : [];
  const cleanedSavedRestaurantIds = Array.isArray(rawSavedRestaurantIds)
    ? rawSavedRestaurantIds.filter(Boolean)
    : [];
  const sortedSavedRestaurantIds = cleanedSavedRestaurantIds.slice().sort();
  const savedRestaurantsSerialized =
    sortedSavedRestaurantIds.length > 0 ? JSON.stringify(sortedSavedRestaurantIds) : '';

  const savedRestaurantsSet = useMemo(() => {
    if (!savedRestaurantsSerialized) return EMPTY_SET;
    try {
      return new Set(JSON.parse(savedRestaurantsSerialized));
    } catch (_err) {
      return EMPTY_SET;
    }
  }, [savedRestaurantsSerialized]);

  const likedRestaurantsSet = useMemo(() => {
    if (!likedItemsSerialized) return EMPTY_SET;
    const restaurantIds = new Set();
    availableItems.forEach((item) => {
      if (item?.restaurantId && likedItemsSet.has(item.id)) {
        restaurantIds.add(item.restaurantId);
      }
    });
    return restaurantIds;
  }, [availableItems, likedItemsSerialized, likedItemsSet]);

  // ---------- click events helpers ----------
  const now = () => Date.now();

  const incrementRestaurantClick = useCallback((restaurantId) => {
    if (!restaurantId) return;
    setClickEvents((prev) => {
      const next = new Map(prev);
      const arr = Array.isArray(next.get(restaurantId)) ? [...next.get(restaurantId)] : [];
      arr.unshift(now()); // keep newest first
      // cap stored events to avoid memory creep
      if (arr.length > 50) arr.length = 50;
      next.set(restaurantId, arr);
      return next;
    });
  }, []);

  const getClicksCount = useCallback(
    (restaurantId) => {
      const arr = clickEvents.get(restaurantId);
      return Array.isArray(arr) ? arr.length : 0;
    },
    [clickEvents]
  );

  const computeRecencyScore = useCallback(
    (restaurantId) => {
      // Sum of decayed weights for each click timestamp.
      // Half-life of 7 days -> decay const
      const arr = clickEvents.get(restaurantId) || [];
      if (!arr.length) return 0;
      const msPerDay = 1000 * 60 * 60 * 24;
      const halfLifeDays = 7;
      const lambda = Math.log(2) / (halfLifeDays * msPerDay); // decay per ms
      const tNow = now();
      let s = 0;
      for (const ts of arr) {
        const dt = Math.max(0, tNow - ts);
        s += Math.exp(-lambda * dt); // recent clicks contribute ~1, older decay
      }
      // normalize by number of stored events so restaurants with many stored clicks don't explode
      return s / (arr.length || 1);
    },
    [clickEvents]
  );

  // ---------- contextual similarity ----------
  function normalizeToken(t) {
    return String(t || '').toLowerCase().trim().replace(/\s+/g, ' ');
  }

  const computeContextualSimilarity = useCallback(
    (restaurant, selections) => {
      if (!restaurant) return 0;
      const features = [
        ...(restaurant.cuisines || []),
        ...(restaurant.ambience || []),
        restaurant.theme || '',
      ]
        .map(normalizeToken)
        .filter(Boolean);

      const prefs = [
        ...(selections?.selectedCuisine || []),
        ...(selections?.selectedMood || []),
        ...(selections?.selectedDiet || []),
      ]
        .map(normalizeToken)
        .filter(Boolean);

      if (!prefs.length || !features.length) return 0;

      // simple overlap ratio (Jaccard-ish)
      const fset = new Set(features);
      const pset = new Set(prefs);
      const intersection = [...pset].filter((p) => fset.has(p)).length;
      const union = new Set([...features, ...prefs]).size || 1;
      return intersection / union; // 0..1
    },
    []
  );

  // ---------- user cuisine profile (for novelty) ----------
  const userCuisineProfile = useMemo(() => {
    const counts = {};
    availableItems.forEach((item) => {
      if (likedItemsSet.has(item.id)) {
        const c = normalizeToken(item.cuisine || 'unknown');
        counts[c] = (counts[c] || 0) + 1;
      }
    });
    return counts; // {cuisine: count}
  }, [availableItems, likedItemsSet]);

  const userTopCuisines = useMemo(() => {
    const entries = Object.entries(userCuisineProfile).sort((a, b) => b[1] - a[1]);
    return entries.map((e) => e[0]).slice(0, 3); // top 3 cuisines
  }, [userCuisineProfile]);

  const computeNovelty = useCallback((restaurant) => {
    if (!restaurant) return 0.05; // small default novelty if no data
    const restCuisines = (restaurant.cuisines || [])
      .map(normalizeToken)
      .filter(Boolean);
    if (!restCuisines.length) return 0.05;
    if (!userTopCuisines.length) return 0.05;

    // novelty = 1 - overlap ratio
    const overlap = restCuisines.filter((c) => userTopCuisines.includes(c)).length;
    const overlapRatio = overlap / Math.max(restCuisines.length, 1);
    // scale to small bump [0.02 .. 0.12]
    return clamp01(1 - overlapRatio) * 0.12;
  }, [userTopCuisines]);

  // ---------- enhanced final score ----------
  const computeFinalScore = useCallback(
    (restaurantId, ratingValue = 0, directLiked = false) => {
      if (!restaurantId) return 0;
      const r = availableRestaurants.find((x) => x.id === restaurantId) || null;

      // Naive Bayes probability (0..1)
      const probability = clamp01(bayesScores.get(restaurantId) ?? 0);

      // normalized rating (0..1)
      const numericRating = Number(ratingValue);
      const normalizedRating =
        Number.isFinite(numericRating) && numericRating > 0
          ? Math.max(0, Math.min(numericRating, 5)) / 5
          : 0;

      // engagement metric
      const totalLiked = likedItemsSet.size || 0;
      const totalClicksAcrossAll = Array.from(clickEvents.values()).reduce(
        (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
        0
      );
      const engagement = totalLiked + totalClicksAcrossAll * 0.5; // clicks matter but less than likes

      // adaptive Bayes weight: trust Bayes more when user has more engagement
      const bayesWeight = Math.min(0.75, 0.25 + clamp01(engagement * 0.04)); // 0.25..0.75

      const hybrid = bayesWeight * probability + (1 - bayesWeight) * normalizedRating;

      // recency boost from clicks for this restaurant
      const recencyScore = computeRecencyScore(restaurantId); // ~0..1 (decayed)
      const clicksCount = getClicksCount(restaurantId);

      const liked =
        directLiked ||
        (likedRestaurantsSet.size > 0 && likedRestaurantsSet.has(restaurantId));
      const saved = savedRestaurantsSet.size > 0 && savedRestaurantsSet.has(restaurantId);

      // raw boost composed from recency, absolute click count, liked, saved
      const rawBoostUncapped =
        0.35 * recencyScore + // recent clicks matter fairly
        0.06 * clicksCount + // small per-click bump
        0.75 * (liked ? 1 : 0) + // liking is a strong signal
        0.4 * (saved ? 1 : 0); // saving means intent

      const rawBoost = Math.min(1, rawBoostUncapped);

      // contextual similarity (0..1)
      const contextBoost = computeContextualSimilarity(r, externalSelections || storeSelections);

      // novelty small bump (favor exploration)
      const novelty = computeNovelty(r);

      // final weighted mix
      // weights: hybrid (content/personalized), interaction boost, contextual, novelty
      const finalScore =
        0.55 * hybrid + 0.25 * rawBoost + 0.15 * contextBoost + novelty;

      // clamp
      return clamp01(finalScore);
    },
    [
      bayesScores,
      clickEvents,
      availableRestaurants,
      likedItemsSet,
      likedRestaurantsSet,
      savedRestaurantsSet,
      computeRecencyScore,
      getClicksCount,
      computeContextualSimilarity,
      computeNovelty,
      externalSelections,
    ]
  );

  // ---------- computeRestaurantMeta etc. (unchanged but kept here) ----------
  function computeRestaurantMeta(rDoc, menusByRestaurant, itemsByRestaurant) {
    const items = (itemsByRestaurant.get(rDoc.$id) || []).map((it) => ({
      id: it.$id,
      name: it.name,
      type: it.type,
      price: toRM(it.priceRM),
      cuisine: it.cuisine || '',
      description: it.description || '',
      tags: it.tags || [],
      mood: it.mood || [],
      rating: it.rating ?? null,
      restaurant: rDoc.name,
      location: rDoc.location || '',
      restaurantId: rDoc.$id,
      menuId: it.menuId,
    }));

    const prices = items.map((i) => parsePriceValue(i.price)).filter((n) => Number.isFinite(n));
    const averagePriceValue = prices.length ? Math.round(sum(prices) / prices.length) : 0;
    const averagePrice = toRM(averagePriceValue);
    const directRating = coerceNumber(rDoc.rating);
    const itemRatingAvg =
      items.length && items.some((i) => Number.isFinite(Number(i.rating)))
        ? Math.round(
            (sum(items.map((i) => (Number.isFinite(Number(i.rating)) ? Number(i.rating) : 0))) /
              items.filter((i) => Number.isFinite(Number(i.rating))).length) *
              10,
          ) / 10
        : null;
    // Show rating from restaurant table; fall back to item average if no rating set
    const rating = directRating ?? itemRatingAvg ?? null;

    return {
      id: rDoc.$id,
      name: rDoc.name,
      location: rDoc.location || '',
      cuisines: rDoc.cuisines || [],
      cuisine: (rDoc.cuisines && rDoc.cuisines[0]) || '',
      ambience: rDoc.ambience || [],
      rating,
      averagePrice,
      averagePriceValue,
      theme: rDoc.theme || '',
      topItems: items.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3).map((i) => i.id),
      menus: (menusByRestaurant.get(rDoc.$id) || []).map((m) => ({
        id: m.$id,
        name: m.name,
      })),
      reviews: [],
      matchesPriceRange(range) {
        switch (range) {
          case 'RM0-RM10': return this.averagePriceValue <= 10;
          case 'RM11-RM20': return this.averagePriceValue >= 11 && this.averagePriceValue <= 20;
          case 'RM21-RM30': return this.averagePriceValue >= 21 && this.averagePriceValue <= 30;
          case 'RM31+':     return this.averagePriceValue >= 31;
          default: return true;
        }
      },
    };
  }

  async function loadData() {
    setLoading(true);
    setLoadError(null);
    try {
      const [rRes, mRes, iRes] = await Promise.all([
        db.listDocuments(DB_ID, COL.restaurants, [Query.limit(200)]),
        db.listDocuments(DB_ID, COL.menus,       [Query.limit(500)]),
        db.listDocuments(DB_ID, COL.items,       [Query.limit(1000)]),
      ]);

      const restaurants = rRes.documents;
      const menus = mRes.documents;
      const items = iRes.documents;

      const menusByRestaurant = new Map();
      for (const m of menus) {
        if (!menusByRestaurant.has(m.restaurantId)) menusByRestaurant.set(m.restaurantId, []);
        menusByRestaurant.get(m.restaurantId).push(m);
      }
      const itemsByRestaurant = new Map();
      for (const it of items) {
        if (!itemsByRestaurant.has(it.restaurantId)) itemsByRestaurant.set(it.restaurantId, []);
        itemsByRestaurant.get(it.restaurantId).push(it);
      }

      const restaurantsMeta = restaurants.map((r) =>
        computeRestaurantMeta(r, menusByRestaurant, itemsByRestaurant)
      );

      const restaurantById = new Map(restaurants.map((r) => [r.$id, r]));
      const flatItems = items.map((it) => {
        const r = restaurantById.get(it.restaurantId);
        return {
          id: it.$id,
          name: it.name,
          type: it.type,
          price: toRM(it.priceRM),
          cuisine: it.cuisine || '',
          description: it.description || '',
          tags: it.tags || [],
          mood: it.mood || [],
          rating: it.rating ?? null,
          restaurant: r ? r.name : '',
          location: r ? (r.location || '') : '',
          restaurantId: it.restaurantId,
          menuId: it.menuId,
        };
      });

      setAvailableRestaurants(restaurantsMeta);
      setAvailableItems(flatItems);
    } catch (e) {
      setLoadError(e?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  // load backend data once
  useEffect(() => { loadData(); }, []);

  // load NB probabilities (we'll use them for hybrid scoring)
  useEffect(() => {
    let cancelled = false;

    async function loadNaiveBayesRecommendations() {
      try {
        const recommendations = await getNaiveBayesRecommendationsForCurrentUser();
        if (cancelled) return;
        const scoreMap = new Map();
        recommendations.forEach((entry) => {
          const id = entry?.restaurant?.id;
          if (id) scoreMap.set(id, entry.probability ?? 0);
        });
        setBayesScores(scoreMap);
      } catch (err) {
        if (!cancelled) {
          console.warn('Failed to load personalized recommendations', err);
          setBayesScores(new Map());
        }
      }
    }

    loadNaiveBayesRecommendations();
    return () => {
      cancelled = true;
    };
  }, [likedItemsSerialized, savedRestaurantsSerialized, foodlistVersion]);

  const storeSelections = usePreferenceSelections();

  useEffect(() => {
    if (
      externalSelections &&
      !arePreferenceSelectionsEqual(externalSelections, storeSelections)
    ) {
      replacePreferenceSelections(externalSelections);
    }
  }, [externalSelections, storeSelections]);

  const activeSelections = externalSelections || storeSelections;
  const selectedDiet = activeSelections?.selectedDiet ?? [];
  const selectedCuisine = activeSelections?.selectedCuisine ?? [];
  const selectedMood = activeSelections?.selectedMood ?? [];
  const selectedPrice = activeSelections?.selectedPrice ?? [];

  // search handlers
  const handleSearchChange = (text) => setSearch(text);
  const handleSubmitSearch = () => setSearch((prev) => prev.trim());
  const handleClearSearch = () => setSearch('');

  // suggestions from live data
  const suggestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];

    const itemMatches = availableItems
      .filter((item) => {
        const nameMatch = String(item.name).toLowerCase().includes(term);
        const restaurantMatch = String(item.restaurant).toLowerCase().includes(term);
        const cuisineMatch = String(item.cuisine).toLowerCase().includes(term);
        return nameMatch || restaurantMatch || cuisineMatch;
      })
      .slice(0, 5)
      .map((item) => ({
        id: `item-${item.id}`,
        label: item.name,
        subtitle: `${item.restaurant} - ${item.price}`,
        kind: 'item',
        payload: item,
      }));

    const restaurantMatches = availableRestaurants
      .filter((r) => {
        const nameMatch = String(r.name).toLowerCase().includes(term);
        const cuisineMatch = String(r.cuisine || '').toLowerCase().includes(term);
        const locationMatch = String(r.location || '').toLowerCase().includes(term);
        const extraCuisineMatch = (r.cuisines || [])
          .map((c) => String(c).toLowerCase())
          .some((c) => c.includes(term));
        return nameMatch || cuisineMatch || locationMatch || extraCuisineMatch;
      })
      .slice(0, 5)
      .map((r) => ({
        id: `restaurant-${r.id}`,
        label: r.name,
        subtitle: `${r.location} - ${r.cuisine}`,
        kind: 'restaurant',
        payload: r,
      }));

    return [...itemMatches, ...restaurantMatches].slice(0, 8);
  }, [search, availableItems, availableRestaurants]);

  const handlePressRestaurant = useCallback(
    (restaurant) => {
      if (!restaurant) return;
      const rid = restaurant.id || restaurant.$id;
      if (rid) incrementRestaurantClick(rid);
      navigation.navigate('RestaurantDetail', { restaurant });
    },
    [incrementRestaurantClick, navigation]
  );

  const handlePressItem = useCallback(
    (item) => {
      if (!item) return;
      if (item.restaurantId) incrementRestaurantClick(item.restaurantId);
      navigation.navigate('PreferenceItemDetail', { item });
    },
    [incrementRestaurantClick, navigation]
  );

  const handleSelectSuggestion = useCallback(
    (s) => {
      if (!s) return;
      if (s.kind === 'item') {
        handlePressItem(s.payload);
      } else if (s.kind === 'restaurant') {
        handlePressRestaurant(s.payload);
      }
      setSearch('');
    },
    [handlePressItem, handlePressRestaurant]
  );

  // ---------------- filters + sorting (Hybrid relevance) ----------------

  const filteredItems = useMemo(() => {
    const items = availableItems.filter((item) => {
      const dietMatch =
        selectedDiet.length === 0 ||
        selectedDiet.some((d) => d.toLowerCase() === String(item.type).toLowerCase());
      const cuisineMatch =
        selectedCuisine.length === 0 ||
        selectedCuisine.some((c) => c.toLowerCase() === String(item.cuisine).toLowerCase());

      const r = availableRestaurants.find((rr) => rr.name === item.restaurant);
      const ambience = (r?.ambience || []).map((x) => String(x).toLowerCase().replace(/ /g, ''));
      const moodMatch =
        selectedMood.length === 0 ||
        selectedMood.every((m) => ambience.includes(String(m).toLowerCase().replace(/ /g, '')));

      const priceMatch =
        selectedPrice.length === 0 ||
        selectedPrice.some((range) => matchesPriceRange(parsePriceValue(item.price), range));

      // search term filtering for items list (by name/restaurant)
      const term = search.trim().toLowerCase();
      const searchMatch =
        term.length === 0 ||
        String(item.name).toLowerCase().includes(term) ||
        String(item.restaurant).toLowerCase().includes(term);

      return dietMatch && cuisineMatch && moodMatch && priceMatch && searchMatch;
    });

    const sorted = [...items];
    if (sortBy === 'rating_desc') {
      sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortBy === 'price_asc') {
      sorted.sort(
        (a, b) => (parsePriceValue(a.price) ?? Number.POSITIVE_INFINITY) - (parsePriceValue(b.price) ?? Number.POSITIVE_INFINITY),
      );
    } else if (sortBy === 'price_desc') {
      sorted.sort(
        (a, b) => (parsePriceValue(b.price) ?? 0) - (parsePriceValue(a.price) ?? 0),
      );
    } else if (sortBy === 'relevance') {
      sorted.sort((a, b) => {
        const probA = bayesScores.has(a.restaurantId)
          ? clamp01(bayesScores.get(a.restaurantId) ?? 0)
          : -1;
        const probB = bayesScores.has(b.restaurantId)
          ? clamp01(bayesScores.get(b.restaurantId) ?? 0)
          : -1;
        if (probB !== probA) return probB - probA;
        const sA = computeFinalScore(
          a.restaurantId,
          a.rating ?? 0,
          likedItemsSet.has(a.id)
        );
        const sB = computeFinalScore(
          b.restaurantId,
          b.rating ?? 0,
          likedItemsSet.has(b.id)
        );
        if (sB !== sA) return sB - sA;
        return (b.rating ?? 0) - (a.rating ?? 0);
      });
    }

    return sorted;
  }, [
    selectedDiet,
    selectedCuisine,
    selectedMood,
    selectedPrice,
    sortBy,
    search,
    availableItems,
    availableRestaurants,
    bayesScores,
    computeFinalScore,
    likedItemsSet,
  ]);

  const filteredRestaurants = useMemo(() => {
    let list = availableRestaurants.filter((r) => {
      const cuisineMatch =
        selectedCuisine.length === 0 ||
        selectedCuisine.some((c) => {
          const cl = String(c).toLowerCase();
          return (
            cl === String(r.cuisine || '').toLowerCase() ||
            (r.cuisines || []).map((cc) => String(cc).toLowerCase()).includes(cl)
          );
        });

      const moodMatch =
        selectedMood.length === 0 ||
        selectedMood.every((m) =>
          (r.ambience || [])
            .map((mm) => String(mm).toLowerCase().replace(/ /g, ''))
            .includes(String(m).toLowerCase().replace(/ /g, ''))
        );

      const dietMatch =
        selectedDiet.length === 0 ||
        availableItems.some(
          (i) =>
            i.restaurant === r.name &&
            selectedDiet.map((d) => String(d).toLowerCase()).includes(String(i.type).toLowerCase())
        );

      const priceMatch =
        selectedPrice.length === 0
          ? true
          : availableItems.some((i) => {
              if (i.restaurant !== r.name) return false;
              const p = parsePriceValue(i.price);
              return selectedPrice.some((range) => matchesPriceRange(p, range));
            });

      // search term filtering for restaurants list
      const term = search.trim().toLowerCase();
      const searchMatch =
        term.length === 0 ||
        String(r.name).toLowerCase().includes(term) ||
        String(r.location || '').toLowerCase().includes(term) ||
        String(r.cuisine || '').toLowerCase().includes(term) ||
        (r.cuisines || []).some((c) => String(c).toLowerCase().includes(term));

      return cuisineMatch && moodMatch && dietMatch && priceMatch && searchMatch;
    });

    if (sortBy === 'rating_desc') {
      list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortBy === 'price_asc') {
      list = [...list].sort(
        (a, b) => (a.averagePriceValue ?? 0) - (b.averagePriceValue ?? 0)
      );
    } else if (sortBy === 'price_desc') {
      list = [...list].sort(
        (a, b) => (b.averagePriceValue ?? 0) - (a.averagePriceValue ?? 0)
      );
    } else if (sortBy === 'relevance') {
      list = [...list].sort((a, b) => {
        const probA = bayesScores.has(a.id)
          ? clamp01(bayesScores.get(a.id) ?? 0)
          : -1;
        const probB = bayesScores.has(b.id)
          ? clamp01(bayesScores.get(b.id) ?? 0)
          : -1;
        if (probB !== probA) return probB - probA;
        const sA = computeFinalScore(a.id, a.rating ?? 0);
        const sB = computeFinalScore(b.id, b.rating ?? 0);
        if (sB !== sA) return sB - sA;
        return (b.rating ?? 0) - (a.rating ?? 0);
      });
    }
    return list;
  }, [
    selectedDiet,
    selectedCuisine,
    selectedMood,
    selectedPrice,
    sortBy,
    search,
    availableRestaurants,
    availableItems,
    bayesScores,
    computeFinalScore,
  ]);

  const topRestaurants = useMemo(() => filteredRestaurants.slice(0, 4), [filteredRestaurants]);
  const restaurantsWithCTA = useMemo(() => {
    if (filteredRestaurants.length > 4) {
      return [...topRestaurants, { id: '__show_all_restaurants__', _cta: true }];
    }
    return topRestaurants;
  }, [topRestaurants, filteredRestaurants.length]);

  const topItems = useMemo(() => filteredItems.slice(0, 4), [filteredItems]);
  const itemsWithCTA = useMemo(() => {
    if (filteredItems.length > 4) {
      return [...topItems, { id: '__show_all_items__', _cta: true }];
    }
    return topItems;
  }, [topItems, filteredItems.length]);

  const handleShowAllRestaurants = () => {
    if (filteredRestaurants.length) {
      navigation.navigate('AllRestaurants', { restaurants: filteredRestaurants });
    }
  };
  const handleShowAllDishes = () => {
    if (filteredItems.length) {
      navigation.navigate('AllDishes', { items: filteredItems });
    }
  };

  // simple loading/error screens
  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: '#FFF5ED' }}
        edges={['top', 'right', 'bottom', 'left']}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (loadError) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: '#FFF5ED' }}
        edges={['top', 'right', 'bottom', 'left']}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <Text style={{ color: 'red', textAlign: 'center' }}>{loadError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    // ------------------- UI (your original design) -------------------
    <SafeAreaView
      style={{ flex: 1, backgroundColor: '#FFF5ED', paddingTop: 0 }}
      edges={['right', 'bottom', 'left']}
    >
      <StatusBar backgroundColor="#FF4D00" barStyle="light-content" translucent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Discover Food For You</Text>

          {/* Tagline + Edit icon beside it */}
          <View style={styles.subtitleRow}>
            <Text style={styles.headerSubtitle}>Your taste, your vibe, your pick</Text>
            <TouchableOpacity onPress={onStartQuestionnaire} style={styles.editIconHeader}>
              <Icon name="sliders" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchField}>
            <TextInput
              placeholder="Search..."
              value={search}
              onChangeText={handleSearchChange}
              style={styles.searchInput}
              placeholderTextColor="#9a9a9a"
              returnKeyType="search"
              onSubmitEditing={handleSubmitSearch}
            />
            <View style={styles.searchDivider} />
            <TouchableOpacity
              onPress={handleSubmitSearch}
              style={styles.searchIconButton}
              accessibilityRole="button"
              accessibilityLabel="Search"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Icon name="search" size={18} color="#8f8f8f" />
            </TouchableOpacity>
            {search.trim().length > 0 ? (
              <TouchableOpacity
                onPress={handleClearSearch}
                style={styles.clearIconButton}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Icon name="x" size={16} color="#8f8f8f" />
              </TouchableOpacity>
            ) : null}
          </View>

          {search.trim().length > 0 ? (
            <View style={styles.suggestionsDropdown}>
              {suggestions.length > 0 ? (
                suggestions.map((sugg, index) => (
                  <TouchableOpacity
                    key={sugg.id}
                    style={[
                      styles.suggestionItem,
                      index === suggestions.length - 1 && styles.suggestionItemLast,
                    ]}
                    onPress={() => handleSelectSuggestion(sugg)}
                  >
                    <Text style={styles.suggestionLabel}>{sugg.label}</Text>
                    <Text style={styles.suggestionMeta}>{sugg.subtitle}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.suggestionsEmpty}>
                  <Text style={styles.suggestionsEmptyText}>No matches found</Text>
                </View>
              )}
            </View>
          ) : null}
        </View>

        {/* Sort Section */}
        <View style={styles.sortRow}>
          {[
            { key: 'relevance', label: 'For You' },
            { key: 'rating_desc', label: 'Best Rated' },
            { key: 'price_asc', label: 'Affordable' },
            { key: 'price_desc', label: 'Fancy' },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setSortBy(opt.key)}
              style={[styles.sortTab, sortBy === opt.key && styles.sortTabActive]}
            >
              <Text style={[styles.sortTabText, sortBy === opt.key && styles.sortTabTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.divider} />

        {/* Restaurants */}
        <SectionTitle
          title="Recommended Restaurants"
        />
        <FlatList
          data={(() => {
            const tr = filteredRestaurants.slice(0, 4);
            return filteredRestaurants.length > 4
              ? [...tr, { id: '__show_all_restaurants__', _cta: true }]
              : tr;
          })()}
          keyExtractor={(r) => r.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 16 }}
          renderItem={({ item: r }) =>
            r._cta ? (
              <TouchableOpacity
                style={[styles.showAllCard, styles.showAllCardRestaurant]}
                onPress={handleShowAllRestaurants}
              >
                <Text style={styles.showAllCardText}>
                  Show all ({filteredRestaurants.length})
                </Text>
                <Icon name="chevron-right" size={18} color="#FF4D00" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.restaurantCard}
                onPress={() => handlePressRestaurant(r)}
              >
                <Text style={styles.restaurantName}>{r.name}</Text>
                <Text style={styles.itemTags}>{r.location} - {r.cuisine}</Text>

                {/* show % match whenever we have a Bayes score */}
                {bayesScores.has(r.id) ? (
                  <View style={{ marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Badge text={`${pct(bayesScores.get(r.id))}% match to your taste`} color="#E6FFED" />
                    </View>
                    <View style={{ height: 6, backgroundColor: '#FFE8D2', borderRadius: 6, overflow: 'hidden' }}>
                      <View
                        style={{
                          height: '100%',
                          width: `${pct(bayesScores.get(r.id))}%`,
                          backgroundColor: '#22C55E',
                        }}
                      />
                    </View>
                  </View>
                ) : null}

                <View style={styles.badgeRow}>
                  <Badge
                    text={`Rating ${Number.isFinite(r.rating) ? r.rating.toFixed(1) : '-'}`}
                    color="#FFD89E"
                  />
                  <Badge text={r.averagePrice} />
                </View>
              </TouchableOpacity>
            )
          }
        />
        <View style={styles.divider} />

        {/* Dishes */}
        <SectionTitle title="Recommended Dishes" style={{ marginTop: 24 }} />
        <FlatList
          data={(() => {
            const ti = filteredItems.slice(0, 4);
            return filteredItems.length > 4
              ? [...ti, { id: '__show_all_items__', _cta: true }]
              : ti;
          })()}
          keyExtractor={(i) => i.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 16, paddingBottom: 24 }}
          renderItem={({ item }) =>
            item._cta ? (
              <TouchableOpacity
                style={[styles.showAllCard, styles.showAllCardItem]}
                onPress={handleShowAllDishes}
              >
                <Text style={styles.showAllCardText}>
                  Show all ({filteredItems.length})
                </Text>
                <Icon name="chevron-right" size={18} color="#FF4D00" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.itemCard}
                onPress={() => handlePressItem(item)}
              >
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemTags}>{item.restaurant}</Text>

                {/* % match from the item's restaurant when score exists */}
                {bayesScores.has(item.restaurantId) ? (
                  <View style={{ marginTop: 6 }}>
                    <Badge
                      text={`${pct(bayesScores.get(item.restaurantId))}% match to your taste`}
                      color="#E6FFED"
                    />
                  </View>
                ) : null}

                <View style={styles.badgeRow}>
                  <Badge text={item.price} color="#FFA94D" />
                  <Badge text={item.type} color="#FFF0E0" />
                </View>
                <Text style={[styles.itemTags, { marginTop: 6 }]}>
                  Cuisine: {item.cuisine}
                </Text>
              </TouchableOpacity>
            )
          }
        />
        <View style={[styles.divider, { marginBottom: 24 }]} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Badge({ text, color = '#e5e7eb' }) {
  return (
    <View style={{ backgroundColor: color, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 }}>
      <Text style={{ fontSize: 12, color: '#111827' }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    padding: 22,
    backgroundColor: '#FF4D00',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerSubtitle: { color: '#fff', opacity: 0.95, fontSize: 15, flexShrink: 1, paddingRight: 10 },
  editIconHeader: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: 'rgba(255,255,255,0.15)' },

  searchField: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#d8d4d4', paddingHorizontal: 10, height: 40 },
  searchInput: { flex: 1, fontSize: 15, color: '#333', paddingVertical: 6 },
  searchDivider: { height: '70%', width: 1, backgroundColor: '#d8d4d4', marginHorizontal: 8 },
  searchIconButton: { padding: 6, borderRadius: 12 },
  clearIconButton: { padding: 6, borderRadius: 12, marginLeft: 4 },
  suggestionsDropdown: { marginTop: 8, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#FFE8D2', shadowColor: '#FF4D00', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 3 },
  suggestionItem: { paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#FFE8D2' },
  suggestionItemLast: { borderBottomWidth: 0 },
  suggestionLabel: { fontSize: 15, fontWeight: '700', color: '#3C1E12' },
  suggestionMeta: { marginTop: 2, color: '#6B4A3F', fontSize: 12 },
  suggestionsEmpty: { paddingVertical: 14, paddingHorizontal: 14 },
  suggestionsEmptyText: { color: '#6B4A3F', fontSize: 13 },

  sortRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 16 },
  sortTab: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#ffe3c6ff', marginRight: 8 },
  sortTabActive: { backgroundColor: '#FF4D00' },
  sortTabText: { color: '#333', fontWeight: '600', fontSize: 13 },
  sortTabTextActive: { color: '#fff' },

  restaurantCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 14, width: 260, marginRight: 14, elevation: 3, borderColor: '#FFE8D2', borderWidth: 1 },
  restaurantName: { fontWeight: 'bold', fontSize: 18, color: '#000' },

  itemCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 14, width: 240, marginRight: 14, elevation: 3, borderColor: '#FFE8D2', borderWidth: 1 },
  itemName: { fontWeight: 'bold', fontSize: 18, color: '#000' },
  itemTags: { color: '#666', fontSize: 14 },
  badgeRow: { flexDirection: 'row', marginTop: 6 },

  showAllCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 10, marginRight: 14, elevation: 3, borderColor: '#FF4D00', borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4, flexDirection: 'row' },
  showAllCardRestaurant: { width: 130 },
  showAllCardItem: { width: 120 },
  showAllCardText: { color: '#FF4D00', fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#FFC299', marginHorizontal: 20, marginVertical: 10, borderRadius: 2 },
});

function SectionTitle({ title, right, style }) {
  return (
    <View
      style={[
        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginVertical: 12 },
        style,
      ]}
    >
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#FF4D00' }}>{title}</Text>
      {typeof right === 'string' || typeof right === 'number' ? (
        <Text style={{ color: '#6b7280' }}>{right}</Text>
      ) : (
        right || null
      )}
    </View>
  );
}
