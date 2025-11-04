// screens/RestaurantDetailScreen.js
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Polyline from '@mapbox/polyline';
import Constants from 'expo-constants';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  PanResponder,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Polyline as MapPolyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { availableItems } from '../data/mockData';
import { getUserItemsForRestaurant } from '../state/userMenusStore';
import {
  isRestaurantSaved,
  saveRestaurant,
  unsaveRestaurant,
} from '../state/libraryStore';
import { addUserReview, getUserReviews } from '../state/reviewsStore';
import {
  MALAYSIA_CENTER,
  STAR,
  STEP_ARRIVAL_RADIUS_METERS,
} from '././RestaurantDetailScreen.constants';
import { DARK_MAP_STYLE, styles } from '././RestaurantDetailScreen.styles';
import { Badge, Chip, Section, StarInput } from './RestaurantDetailScreen.ui';
import {
  clamp,
  deriveCoordinate,
  formatManeuverLabel,
  getArrowIcon,
  haversineDistance,
  stripHtml,
} from './RestaurantDetailScreen.helpers';

// Read Google Maps API key from env/config
const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
  Constants.expoConfig?.extra?.googleMapsApiKey ??
  Constants.expoConfig?.android?.config?.googleMaps?.apiKey ??
  Constants.manifest?.extra?.googleMapsApiKey ??
  '';

const NAVIGATION_ZOOM = 17.5;
const NAVIGATION_PITCH = 60;
const USER_VERTICAL_TARGET_FRACTION = 0.7;
const METERS_PER_PIXEL_AT_EQUATOR = 156543.03392;
const EARTH_RADIUS_METERS = 6378137;

const moveCoordinateByDistance = (coordinate, distanceMeters, bearingDegrees) => {
  if (!distanceMeters) {
    return coordinate;
  }

  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;
  const bearingRad = (bearingDegrees * Math.PI) / 180;
  const latRad = (coordinate.latitude * Math.PI) / 180;
  const lngRad = (coordinate.longitude * Math.PI) / 180;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearingRad),
  );

  const newLngRad =
    lngRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(newLatRad),
    );

  return {
    latitude: (newLatRad * 180) / Math.PI,
    longitude: (newLngRad * 180) / Math.PI,
  };
};

const getMetersPerPixel = (latitude) =>
  (METERS_PER_PIXEL_AT_EQUATOR * Math.cos((latitude * Math.PI) / 180)) /
  Math.pow(2, NAVIGATION_ZOOM);

export default function RestaurantDetailScreen({ route, navigation }) {
  const { restaurant } = route.params;

  const baseCoordinate = useMemo(
    () => deriveCoordinate(restaurant),
    [restaurant],
  );
  const mapRegion = useMemo(
    () => ({
      latitude: baseCoordinate.latitude,
      longitude: baseCoordinate.longitude,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    }),
    [baseCoordinate.latitude, baseCoordinate.longitude],
  );

  const insets = useSafeAreaInsets();
  const windowHeight = Dimensions.get('window').height;
  const collapsedSnap = windowHeight * 0.58;
  const expandedSnap = Math.max(insets.top + 60, windowHeight * 0.18);

  const sheetTranslateY = useRef(new Animated.Value(collapsedSnap)).current;
  const dragStart = useRef(collapsedSnap);
  const mapRef = useRef(null);
  const locationWatcher = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const userCoords = useMemo(() => {
    if (!userLocation?.coords) {
      return null;
    }
    const { latitude, longitude } = userLocation.coords;
    return { latitude, longitude };
  }, [userLocation]);
  const [routeSteps, setRouteSteps] = useState([]);
  const [routePolyline, setRoutePolyline] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [nextStep, setNextStep] = useState(null);
  const [navigationActive, setNavigationActive] = useState(false);
  const [keepFollowing, setKeepFollowing] = useState(false);
  const [showRecenter, setShowRecenter] = useState(false);
  const [navSummary, setNavSummary] = useState(null);
  const [previewPolyline, setPreviewPolyline] = useState([]);
  const [previewSummary, setPreviewSummary] = useState(null);
  const [mapDimensions, setMapDimensions] = useState(null);

  const routeStepsRef = useRef(routeSteps);
  const currentStepIndexRef = useRef(currentStepIndex);
  const nextStepRef = useRef(nextStep);
  const navigationActiveRef = useRef(navigationActive);
  const keepFollowingRef = useRef(keepFollowing);
  const routePolylineRef = useRef(routePolyline);
  const fetchDirectionsRef = useRef(null);
  const getDistanceToRouteRef = useRef(null);
  const initialRouteFetchedRef = useRef(false);
  const lastRouteFetchRef = useRef(0);
  const previewFittedRef = useRef(false);
  const previewFetchedRef = useRef(false);
  const previewFetchInFlightRef = useRef(false);
  const lastHeadingRef = useRef(0);

  useEffect(() => {
    routeStepsRef.current = routeSteps;
  }, [routeSteps]);

  useEffect(() => {
    currentStepIndexRef.current = currentStepIndex;
  }, [currentStepIndex]);

  useEffect(() => {
    nextStepRef.current = nextStep;
  }, [nextStep]);

  useEffect(() => {
    navigationActiveRef.current = navigationActive;
  }, [navigationActive]);

  useEffect(() => {
    keepFollowingRef.current = keepFollowing;
  }, [keepFollowing]);

  useEffect(() => {
    routePolylineRef.current = routePolyline;
  }, [routePolyline]);

  const resolveHeading = useCallback((rawHeading) => {
    if (typeof rawHeading === 'number' && !Number.isNaN(rawHeading)) {
      lastHeadingRef.current = rawHeading;
      return rawHeading;
    }
    return lastHeadingRef.current;
  }, [animateNavigationCamera, resolveHeading, stopNavigation]);

  const computeNavigationCenter = useCallback(
    (coordinate, heading) => {
      if (!coordinate) {
        return coordinate;
      }
      if (!mapDimensions?.height) {
        return coordinate;
      }
      const metersPerPixel = getMetersPerPixel(coordinate.latitude);
      const pixelOffsetY = (USER_VERTICAL_TARGET_FRACTION - 0.5) * mapDimensions.height;
      const distanceMeters = pixelOffsetY * metersPerPixel;

      if (!Number.isFinite(distanceMeters) || Number.isNaN(distanceMeters)) {
        return coordinate;
      }

      return moveCoordinateByDistance(coordinate, distanceMeters, heading);
    },
    [mapDimensions],
  );

  const animateNavigationCamera = useCallback(
    (coordinate, rawHeading, duration = 600) => {
      if (!mapRef.current || !coordinate) {
        return;
      }
      const heading = resolveHeading(rawHeading);
      const center = computeNavigationCenter(coordinate, heading);

      mapRef.current.animateCamera(
        {
          center,
          zoom: NAVIGATION_ZOOM,
          pitch: NAVIGATION_PITCH,
          heading,
        },
        { duration },
      );
    },
    [computeNavigationCenter, resolveHeading],
  );

  const handleMapLayout = useCallback((event) => {
    const { width, height } = event.nativeEvent.layout;
    setMapDimensions((prev) => {
      if (prev && prev.width === width && prev.height === height) {
        return prev;
      }
      return { width, height };
    });
  }, []);

  const recenterToRestaurant = useCallback(() => {
    if (!mapRef.current) {
      return;
    }

    if (navigationActiveRef.current) {
      const center = {
        latitude: baseCoordinate.latitude,
        longitude: baseCoordinate.longitude,
      };
      mapRef.current.animateCamera(
        {
          center,
          zoom: NAVIGATION_ZOOM,
          pitch: NAVIGATION_PITCH,
          heading: resolveHeading(userLocation?.coords?.heading),
        },
        { duration: 450 },
      );
      return;
    }

    mapRef.current.animateToRegion(mapRegion, 450);
  }, [
    baseCoordinate.latitude,
    baseCoordinate.longitude,
    mapRegion,
    resolveHeading,
    userLocation,
  ]);

  const clearPreviewRoute = useCallback(() => {
    previewFetchedRef.current = false;
    previewFittedRef.current = false;
    setPreviewPolyline([]);
    setPreviewSummary(null);
  }, []);

  const recenterToUser = useCallback(() => {
    if (!mapRef.current || !userCoords) {
      recenterToRestaurant();
      return;
    }

    keepFollowingRef.current = true;
    setKeepFollowing(true);
    setShowRecenter(false);
    const center = {
      latitude: userCoords.latitude,
      longitude: userCoords.longitude,
    };
    const heading = resolveHeading(userLocation?.coords?.heading);

    if (navigationActiveRef.current) {
      requestAnimationFrame(() => {
        animateNavigationCamera(center, heading, 600);
      });
      return;
    }

    mapRef.current.animateToRegion(
      {
        ...center,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      },
      350,
    );
    requestAnimationFrame(() => {
      mapRef.current?.animateCamera(
        {
          center,
          zoom: 17.5,
          pitch: 45,
          heading,
        },
        { duration: 600 },
      );
    });
  }, [
    animateNavigationCamera,
    recenterToRestaurant,
    resolveHeading,
    userCoords,
    userLocation,
  ]);

  const focusOnUserForNavigation = useCallback(() => {
    if (!mapRef.current) {
      return;
    }

    keepFollowingRef.current = true;
    setKeepFollowing(true);
    setShowRecenter(false);

    const target = userCoords
      ? { latitude: userCoords.latitude, longitude: userCoords.longitude }
      : { latitude: baseCoordinate.latitude, longitude: baseCoordinate.longitude };

    requestAnimationFrame(() => {
      animateNavigationCamera(target, userLocation?.coords?.heading, 800);
    });
  }, [
    animateNavigationCamera,
    baseCoordinate.latitude,
    baseCoordinate.longitude,
    userCoords,
    userLocation,
  ]);

  useEffect(() => {
    if (navigationActive && userCoords) {
      focusOnUserForNavigation();
    }
  }, [navigationActive, userCoords, focusOnUserForNavigation]);

  const getDistanceToRoute = useCallback(
    (coords) => {
      if (!coords || !routePolyline.length) {
        return Number.POSITIVE_INFINITY;
      }

      let minDistance = Number.POSITIVE_INFINITY;
      for (let i = 0; i < routePolyline.length; i += 1) {
        const point = routePolyline[i];
        const dist = haversineDistance(coords, point);
        if (dist < minDistance) {
          minDistance = dist;
        }
      }
      return minDistance;
    },
    [routePolyline],
  );

  const decodeDirections = useCallback((directions) => {
    const leg = directions?.routes?.[0]?.legs?.[0] || null;
    const rawSteps = leg?.steps || [];
    const parsedSteps = rawSteps.map((step) => ({
      instruction: stripHtml(step.html_instructions || ''),
      maneuver: step.maneuver || null,
      distance: step.distance?.text || null,
      duration: step.duration?.text || null,
      endLocation: step.end_location
        ? { latitude: step.end_location.lat, longitude: step.end_location.lng }
        : null,
    }));

    const encodedPolyline = directions?.routes?.[0]?.overview_polyline?.points;
    let routeCoords = [];
    if (encodedPolyline) {
      routeCoords = Polyline.decode(encodedPolyline).map(([lat, lng]) => ({
        latitude: lat,
        longitude: lng,
      }));
    }

    const distanceText = leg?.distance?.text ?? null;
    const distanceValue = leg?.distance?.value ?? null;
    const durationText = leg?.duration?.text ?? null;
    const durationValue = leg?.duration?.value ?? null;
    const etaMs = durationValue ? Date.now() + durationValue * 1000 : null;

    return {
      parsedSteps,
      routeCoords,
      summary: leg
        ? {
          distanceText,
          distanceValue,
          durationText,
          durationValue,
          eta: etaMs,
        }
        : null,
    };
  }, []);

  const parseDirections = useCallback(
    (directions) => {
      if (!navigationActiveRef.current) {
        return;
      }

      const { parsedSteps, routeCoords, summary } =
        decodeDirections(directions);

      setNavSummary(summary);
      setRoutePolyline(routeCoords);
      setRouteSteps(parsedSteps);
      setCurrentStepIndex(0);
      setNextStep(parsedSteps[0] || null);

      if (routeCoords.length && mapRef.current && userCoords && summary) {
        requestAnimationFrame(() => {
          animateNavigationCamera(userCoords, userLocation?.coords?.heading, 1000);
        });
      }

      if (!parsedSteps.length) {
        navigationActiveRef.current = false;
        setNavSummary(null);
        setRoutePolyline([]);
        setRouteSteps([]);
        setCurrentStepIndex(0);
        setNextStep(null);
        setNavigationActive(false);
      }
    },
    [animateNavigationCamera, decodeDirections, userCoords, userLocation],
  );

  const fetchDirections = useCallback(async () => {
    if (!navigationActiveRef.current) {
      return;
    }

    if (!userCoords) {
      return;
    }

    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('Navigation failed: Google Maps API key is missing');
      return;
    }

    try {
      const origin = `${userCoords.latitude},${userCoords.longitude}`;
      const destination = `${baseCoordinate.latitude},${baseCoordinate.longitude}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();
      if (!navigationActiveRef.current) {
        return;
      }
      parseDirections(data);
      initialRouteFetchedRef.current = true;
      lastRouteFetchRef.current = Date.now();
    } catch (error) {
      console.warn('Failed to fetch directions', error);
    }
  }, [
    GOOGLE_MAPS_API_KEY,
    userCoords,
    baseCoordinate.latitude,
    baseCoordinate.longitude,
    parseDirections,
  ]);

  const fetchPreviewRoute = useCallback(async () => {
    if (navigationActiveRef.current) {
      return;
    }
    if (previewFetchInFlightRef.current) {
      return;
    }
    if (!userCoords) {
      return;
    }
    if (!GOOGLE_MAPS_API_KEY) {
      return;
    }

    previewFetchInFlightRef.current = true;
    try {
      const origin = `${userCoords.latitude},${userCoords.longitude}`;
      const destination = `${baseCoordinate.latitude},${baseCoordinate.longitude}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();
      if (navigationActiveRef.current) {
        return;
      }
      const { routeCoords, summary } = decodeDirections(data);
      setPreviewPolyline(routeCoords);
      setPreviewSummary(summary);
      previewFetchedRef.current = true;

      if (
        routeCoords.length &&
        mapRef.current &&
        !navigationActiveRef.current &&
        !previewFittedRef.current
      ) {
        // Enhanced route fitting with better padding for overview
        mapRef.current.fitToCoordinates(routeCoords, {
          edgePadding: { top: 140, right: 60, bottom: 220, left: 60 },
          animated: true,
        });
        previewFittedRef.current = true;
      }
    } catch (error) {
      console.warn('Failed to fetch preview directions', error);
    } finally {
      previewFetchInFlightRef.current = false;
    }
  }, [
    GOOGLE_MAPS_API_KEY,
    baseCoordinate.latitude,
    baseCoordinate.longitude,
    decodeDirections,
    userCoords,
  ]);

  useEffect(() => {
    fetchDirectionsRef.current = fetchDirections;
  }, [fetchDirections]);

  useEffect(() => {
    getDistanceToRouteRef.current = getDistanceToRoute;
  }, [getDistanceToRoute]);

  useEffect(() => {
    if (navigationActive) {
      return;
    }
    if (!userCoords) {
      return;
    }
    if (previewFetchedRef.current) {
      return;
    }
    fetchPreviewRoute();
  }, [navigationActive, userCoords, fetchPreviewRoute]);



  useEffect(() => {
    if (!navigationActive) {
      initialRouteFetchedRef.current = false;
      return;
    }
    if (!userCoords) {
      return;
    }
    if (!initialRouteFetchedRef.current) {
      initialRouteFetchedRef.current = true;
      fetchDirections();
    }
  }, [navigationActive, userCoords, fetchDirections]);

  useEffect(() => {
    if (!navigationActive) {
      return;
    }
    const id = setInterval(() => {
      if (!navigationActiveRef.current) {
        return;
      }
      if (Date.now() - lastRouteFetchRef.current >= 15000) {
        fetchDirectionsRef.current?.();
      }
    }, 25000);
    return () => clearInterval(id);
  }, [navigationActive]);

  const stopNavigation = useCallback(() => {
    navigationActiveRef.current = false;
    routeStepsRef.current = [];
    currentStepIndexRef.current = 0;
    nextStepRef.current = null;
    keepFollowingRef.current = false;

    setKeepFollowing(false);
    setRoutePolyline([]);
    setRouteSteps([]);
    setCurrentStepIndex(0);
    setNextStep(null);
    setNavSummary(null);
    setNavigationActive(false);
    initialRouteFetchedRef.current = false;
    lastRouteFetchRef.current = 0;
    clearPreviewRoute();
  }, [clearPreviewRoute]);

  useEffect(() => {
    let isMounted = true;

    const startLocationUpdates = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          return;
        }

        const current = await Location.getCurrentPositionAsync({});
        if (isMounted) {
          setUserLocation(current);
        }

        if (locationWatcher.current) {
          locationWatcher.current.remove();
          locationWatcher.current = null;
        }

        locationWatcher.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Highest,
            distanceInterval: 1,
          },
          (location) => {
            if (!isMounted) {
              return;
            }

            setUserLocation(location);

            const coords = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };

            const heading = resolveHeading(location.coords.heading);

            if (navigationActiveRef.current && mapRef.current) {
              if (!keepFollowingRef.current) {
                keepFollowingRef.current = true;
                setKeepFollowing(true);
              }
              requestAnimationFrame(() => {
                animateNavigationCamera(coords, heading, 400);
              });
            } else if (keepFollowingRef.current && mapRef.current) {
              mapRef.current.animateToRegion(
                {
                  ...coords,
                  latitudeDelta: 0.004,
                  longitudeDelta: 0.004,
                },
                250,
              );
              requestAnimationFrame(() => {
                mapRef.current?.animateCamera(
                  {
                    center: coords,
                    zoom: 17.5,
                    pitch: 45,
                    heading,
                  },
                  { duration: 400 },
                );
              });
            }

            const distanceFromRoute = getDistanceToRouteRef.current
              ? getDistanceToRouteRef.current(coords)
              : Number.POSITIVE_INFINITY;
            if (
              navigationActiveRef.current &&
              distanceFromRoute > 40 &&
              Date.now() - lastRouteFetchRef.current > 10000
            ) {
              fetchDirectionsRef.current?.();
            }

            if (!navigationActiveRef.current) {
              return;
            }

            const upcomingStep = nextStepRef.current;
            if (!upcomingStep || !upcomingStep.endLocation) {
              return;
            }

            const distance = haversineDistance(
              coords,
              upcomingStep.endLocation,
            );
            if (distance > STEP_ARRIVAL_RADIUS_METERS) {
              return;
            }

            const steps = routeStepsRef.current;
            const newIndex = currentStepIndexRef.current + 1;
            const nextStepCandidate = steps[newIndex];

            if (nextStepCandidate) {
              setCurrentStepIndex(newIndex);
              setNextStep(nextStepCandidate);
            } else {
              stopNavigation();
            }
          },
        );
      } catch (error) {
        console.warn('Unable to start location updates', error);
      }
    };

    startLocationUpdates();

    return () => {
      isMounted = false;
      if (locationWatcher.current) {
        locationWatcher.current.remove();
        locationWatcher.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!navigationActive || !userCoords || !routeSteps.length) {
      return;
    }

    const activeStep = routeSteps[currentStepIndex];
    if (!activeStep || !activeStep.endLocation) {
      return;
    }

    const distanceToEnd = haversineDistance(
      userCoords,
      activeStep.endLocation,
    );
    if (distanceToEnd <= STEP_ARRIVAL_RADIUS_METERS) {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < routeSteps.length) {
        setCurrentStepIndex(nextIndex);
        setNextStep(routeSteps[nextIndex]);
      } else {
        stopNavigation();
      }
    }
  }, [
    navigationActive,
    userCoords,
    routeSteps,
    currentStepIndex,
    stopNavigation,
  ]);
  useEffect(() => {
    sheetTranslateY.setValue(collapsedSnap);
    dragStart.current = collapsedSnap;
  }, [collapsedSnap, sheetTranslateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 4,
        onPanResponderGrant: () => {
          sheetTranslateY.stopAnimation((value) => {
            dragStart.current = value;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          const next = clamp(
            dragStart.current + gestureState.dy,
            expandedSnap,
            collapsedSnap,
          );
          sheetTranslateY.setValue(next);
        },
        onPanResponderRelease: (_, gestureState) => {
          const projected = clamp(
            dragStart.current + gestureState.dy,
            expandedSnap,
            collapsedSnap,
          );
          const midpoint = (expandedSnap + collapsedSnap) / 2;
          const target =
            projected <= midpoint || gestureState.vy < -0.2
              ? expandedSnap
              : collapsedSnap;

          dragStart.current = target;
          Animated.spring(sheetTranslateY, {
            toValue: target,
            useNativeDriver: true,
            damping: 18,
            stiffness: 160,
          }).start();
        },
      }),
    [collapsedSnap, expandedSnap, sheetTranslateY],
  );

  const items = useMemo(() => {
    const base = availableItems.filter((i) => i.restaurant === restaurant.name);
    const user = getUserItemsForRestaurant(restaurant.id);
    return [...base, ...user];
  }, [restaurant.name, restaurant.id]);

  const [userReviews, setUserReviews] = useState(getUserReviews(restaurant.id));
  const [showReview, setShowReview] = useState(false);
  const [taste, setTaste] = useState(0);
  const [location, setLocation] = useState(0);
  const [coziness, setCoziness] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(isRestaurantSaved(restaurant.id));

  const animatedSheetStyle = useMemo(
    () => [
      styles.sheetBase,
      {
        height: windowHeight + insets.bottom,
        paddingBottom: insets.bottom + 24,
        transform: [{ translateY: sheetTranslateY }],
      },
    ],
    [insets.bottom, sheetTranslateY, windowHeight],
  );

  const thenStep = useMemo(
    () => routeSteps[currentStepIndex + 1] || null,
    [routeSteps, currentStepIndex],
  );

  const displayedPolyline = useMemo(
    () => (navigationActive ? routePolyline : previewPolyline),
    [navigationActive, routePolyline, previewPolyline],
  );

  const previewDistanceDisplay = useMemo(() => {
    if (!previewSummary) {
      return null;
    }
    if (previewSummary.distanceText) {
      return previewSummary.distanceText;
    }
    if (typeof previewSummary.distanceValue === 'number') {
      return `${(previewSummary.distanceValue / 1000).toFixed(1)} km`;
    }
    return null;
  }, [previewSummary]);

  const previewDurationDisplay = useMemo(
    () => previewSummary?.durationText ?? null,
    [previewSummary],
  );

  const distanceDisplay = useMemo(() => {
    if (!navSummary) {
      return null;
    }
    if (navSummary.distanceText) {
      return navSummary.distanceText;
    }
    if (typeof navSummary.distanceValue === 'number') {
      return `${(navSummary.distanceValue / 1000).toFixed(1)} km`;
    }
    return null;
  }, [navSummary]);

  const arrivalTime = useMemo(() => {
    if (!navSummary?.eta) {
      return null;
    }
    return new Date(navSummary.eta);
  }, [navSummary]);

  const arrivalDisplay = useMemo(() => {
    if (!arrivalTime) {
      return null;
    }
    return arrivalTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [arrivalTime]);

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        style={styles.map}
        onLayout={handleMapLayout}
        initialRegion={mapRegion}
        customMapStyle={navigationActive ? DARK_MAP_STYLE : undefined}
        onPanDrag={() => {
          keepFollowingRef.current = false;
          setKeepFollowing(false);
          setShowRecenter(true);
        }}
      >
        <Marker
          coordinate={baseCoordinate}
          title={restaurant.name}
          description={restaurant.location}
        />
        {userCoords ? (
          <Marker
            coordinate={userCoords}
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={userLocation?.coords?.heading ?? 0}
            flat
          >
            <View style={styles.userMarkerHalo}>
              <View style={styles.userMarker}>
                <Ionicons name="navigate" size={22} color="#2563eb" />
              </View>
            </View>
          </Marker>
        ) : null}

        {displayedPolyline.length > 0 && (
          <MapPolyline
            coordinates={displayedPolyline}
            strokeWidth={5}
            strokeColor="#2563eb"
          />
        )}

        {nextStep?.endLocation ? (
          <Marker coordinate={nextStep.endLocation} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.turnPin}>
              <Ionicons
                name={getArrowIcon(nextStep.maneuver)}
                size={16}
                color="#fff"
              />
            </View>
          </Marker>
        ) : null}
      </MapView>

      {nextStep ? (
        <View
          style={[styles.banner, { top: insets.top + 16 }]}
          pointerEvents="auto"
        >
          <Ionicons
            name={getArrowIcon(nextStep.maneuver)}
            size={32}
            color="#fff"
            style={styles.bannerIcon}
          />
          <View style={{ flex: 1, position: 'relative' }}>
            <Text style={styles.instruction} numberOfLines={2}>
              {nextStep.instruction}
            </Text>
            {nextStep.distance || nextStep.duration ? (
              <Text style={styles.sub}>
                {[nextStep.distance, nextStep.duration]
                  .filter(Boolean)
                  .join(' - ')}
              </Text>
            ) : null}
            {thenStep ? (
              <View style={styles.thenChip}>
                <Text style={styles.thenText}>Then</Text>
                <Ionicons
                  name={getArrowIcon(thenStep.maneuver)}
                  size={16}
                  color="#fff"
                />
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {navigationActive && nextStep ? (
        <View
          style={[styles.navigationStopWrap, { top: insets.top + 16 }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.navigationStopButton}
            onPress={stopNavigation}
            activeOpacity={0.85}
          >
            <Ionicons name="close" size={20} color="#111827" />
          </TouchableOpacity>
        </View>
      ) : null}

      <View
        style={[
          styles.mapControls,
          {
            top:
              navigationActive && navSummary
                ? insets.top + 180
                : nextStep
                  ? insets.top + 150
                  : insets.top + 16,
          },
        ]}
        pointerEvents="box-none"
      >
        {showRecenter ? (
          <TouchableOpacity
            style={styles.mapButton}
            onPress={recenterToUser}
            activeOpacity={0.85}
          >
            <Ionicons name="locate-outline" size={18} color="#111827" />
            <Text style={styles.mapButtonText}>Recenter</Text>
          </TouchableOpacity>
        ) : null}

        {navigationActive && !nextStep && (
          <TouchableOpacity
            style={[
              styles.mapButton,
              {
                marginTop: 8,
                backgroundColor: GOOGLE_MAPS_API_KEY ? '#ffffff' : '#ffebee',
              },
            ]}
            onPress={() => {
              if (!userCoords) {
                Alert.alert(
                  'Resume navigation',
                  'Waiting for your current location...',
                );
                return;
              }
              if (!GOOGLE_MAPS_API_KEY) {
                Alert.alert(
                  'Navigation Error',
                  'Google Maps API key is missing. Please configure it to use navigation features.',
                );
                return;
              }
              clearPreviewRoute();
              initialRouteFetchedRef.current = false;
              lastRouteFetchRef.current = 0;
              keepFollowingRef.current = true;
              setKeepFollowing(true);
              setShowRecenter(false);
              navigationActiveRef.current = true;
              setNavigationActive(true);
              focusOnUserForNavigation();
            }}
            activeOpacity={0.85}
          >
            <Ionicons
              name={
                GOOGLE_MAPS_API_KEY ? 'play-outline' : 'alert-circle-outline'
              }
              size={18}
              color={GOOGLE_MAPS_API_KEY ? '#111827' : '#d32f2f'}
            />
            <Text
              style={[
                styles.mapButtonText,
                { color: GOOGLE_MAPS_API_KEY ? '#111827' : '#d32f2f' },
              ]}
            >
              Resume
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Animated.View style={animatedSheetStyle}>
        <View style={styles.handle} {...panResponder.panHandlers}>
          <View style={styles.grabber} />
        </View>
        {navigationActive && navSummary ? (
          <View style={styles.etaBar}>
            <Text style={styles.etaPrimary}>
              {navSummary.durationText || '--'}
            </Text>
            <Text style={styles.etaSecondary}>
              {[
                distanceDisplay || null,
                arrivalDisplay ? `ETA ${arrivalDisplay}` : null,
              ]
                .filter(Boolean)
                .join(' \u2022 ')}
            </Text>
          </View>
        ) : null}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.sheetContent,
            navigationActive && navSummary
              ? styles.sheetContentWithSummary
              : null,
          ]}
        >
          <View style={styles.headerCard}>
            <TouchableOpacity
              style={styles.iconFab}
              accessibilityRole="button"
              accessibilityLabel={
                saved ? 'Unsave restaurant' : 'Save restaurant'
              }
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => {
                if (saved) {
                  unsaveRestaurant(restaurant.id);
                  setSaved(false);
                } else {
                  saveRestaurant(restaurant.id);
                  setSaved(true);
                }
              }}
            >
              <Ionicons
                name={saved ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
            <Text style={styles.name}>{restaurant.name}</Text>
            <Text style={styles.meta}>{restaurant.location}</Text>
            <View style={styles.badgeRow}>
              <Badge text={`${restaurant.rating} ${STAR}`} color="#fde68a" />
              <Badge text={restaurant.averagePrice} />
              <Badge text={restaurant.cuisines.join(', ')} color="#e0e7ff" />
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: navigationActive ? '#dc2626' : '#111827' },
                ]}
                onPress={() => {


                  if (navigationActive) {
                    stopNavigation();
                    return;
                  }

                  if (!GOOGLE_MAPS_API_KEY) {
                    Alert.alert(
                      'Navigation Error',
                      'Google Maps API key is missing. Please configure it to use navigation features.',
                    );
                    return;
                  }

                  // Start navigation even if no user location yet - the zoom will handle it
                  clearPreviewRoute();
                  initialRouteFetchedRef.current = false;
                  lastRouteFetchRef.current = 0;
                  keepFollowingRef.current = true;
                  setKeepFollowing(true);
                  setShowRecenter(false);
                  navigationActiveRef.current = true;
                  setNavigationActive(true);

                  // Always call focus function - it will handle missing user location
                  focusOnUserForNavigation();

                  if (!userCoords) {
                    // Show a toast instead of blocking the navigation
                    Alert.alert(
                      'Navigation Started',
                      'Getting your location for turn-by-turn directions...',
                    );
                  }
                }}
              >
                <Text style={styles.actionText}>
                  {navigationActive ? 'Stop' : 'Start'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#007AFF' }]}
                onPress={() => {
                  setShowReview(true);
                  setSubmitted(false);
                }}
              >
                <Text style={styles.actionText}>Review</Text>
              </TouchableOpacity>
            </View>
            {!navigationActive && previewDistanceDisplay ? (
              <View style={styles.previewRouteSummary}>
                <Ionicons
                  name="car-outline"
                  size={16}
                  color="#111827"
                  style={styles.previewRouteIcon}
                />
                <Text style={styles.previewRouteText}>
                  {previewDistanceDisplay}
                  {previewDurationDisplay
                    ? ` \u2022 ${previewDurationDisplay}`
                    : ''}
                </Text>
              </View>
            ) : null}
            {navigationActive && nextStep ? (
              <View style={styles.nextStepCard}>
                <Text style={styles.nextStepTitle}>Next turn</Text>
                <Text style={styles.nextStepInstruction}>
                  {nextStep.instruction}
                </Text>
                <View style={styles.nextStepMeta}>
                  {nextStep.maneuver ? (
                    <Badge
                      text={formatManeuverLabel(nextStep.maneuver)}
                      color="#bfdbfe"
                    />
                  ) : null}
                  {nextStep.distance ? (
                    <Badge text={nextStep.distance} />
                  ) : null}
                  {nextStep.duration ? (
                    <Badge text={nextStep.duration} color="#d1fae5" />
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>

          <Section title="Theme">
            <Text style={styles.body}>{restaurant.theme}</Text>
          </Section>

          {restaurant.ambience?.length ? (
            <Section title="Ambience">
              <View style={styles.chipWrap}>
                {restaurant.ambience.map((ambienceLabel, idx) => (
                  <Chip key={`amb-${idx}`} label={ambienceLabel} />
                ))}
              </View>
            </Section>
          ) : null}

          <Section title="Popular Items">
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.itemCard}
                  onPress={() =>
                    navigation.navigate('PreferenceItemDetail', { item })
                  }
                >
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.badgeRow}>
                    <Badge text={item.price} />
                    <Badge text={item.type} color="#e0e7ff" />
                    <Badge text={`${item.rating} ${STAR}`} color="#fde68a" />
                  </View>
                </TouchableOpacity>
              )}
            />
          </Section>

          {(userReviews && userReviews.length) ||
            (restaurant.reviews && restaurant.reviews.length) ? (
            <Section title="Reviews">
              {[...userReviews, ...(restaurant.reviews || [])].map(
                (review, idx) => (
                  <View key={`rev-${idx}`} style={styles.reviewCard}>
                    <Text style={styles.reviewAuthor}>{review.user}</Text>
                    <Text style={styles.reviewMeta}>
                      {review.rating} {STAR}
                    </Text>
                    {review.comment ? (
                      <Text style={styles.reviewBody}>{review.comment}</Text>
                    ) : null}
                    {review.taste || review.location || review.coziness ? (
                      <View style={styles.badgeRow}>
                        {typeof review.taste === 'number' && (
                          <Badge
                            text={`Taste ${review.taste} ${STAR}`}
                            color="#fde68a"
                          />
                        )}
                        {typeof review.location === 'number' && (
                          <Badge
                            text={`Location ${review.location} ${STAR}`}
                            color="#fde68a"
                          />
                        )}
                        {typeof review.coziness === 'number' && (
                          <Badge
                            text={`Coziness ${review.coziness} ${STAR}`}
                            color="#fde68a"
                          />
                        )}
                      </View>
                    ) : null}
                  </View>
                ),
              )}
            </Section>
          ) : null}
        </ScrollView>
      </Animated.View>

      {showReview && (
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.overlayBg}
            onPress={() => setShowReview(false)}
          />
          <View style={styles.modalCard}>
            {!submitted ? (
              <>
                <Text style={styles.modalTitle}>Leave a Review</Text>
                <Text style={styles.modalLabel}>Rate Taste</Text>
                <StarInput value={taste} onChange={setTaste} />
                <Text style={styles.modalLabel}>Rate Location</Text>
                <StarInput value={location} onChange={setLocation} />
                <Text style={styles.modalLabel}>Rate Coziness</Text>
                <StarInput value={coziness} onChange={setCoziness} />
                <Text style={styles.modalLabel}>Comments (optional)</Text>
                <TextInput
                  placeholder="Share more about your experience"
                  value={comment}
                  onChangeText={setComment}
                  style={styles.input}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: '#111827' }]}
                  onPress={() => {
                    const overall =
                      Math.round(
                        ((taste || 0) + (location || 0) + (coziness || 0)) / 3,
                      ) || 0;
                    const newReview = {
                      user: 'You',
                      rating: overall,
                      comment: comment.trim() || undefined,
                      taste,
                      location,
                      coziness,
                    };
                    addUserReview(restaurant.id, newReview);
                    setUserReviews(getUserReviews(restaurant.id));
                    setSubmitted(true);
                    setComment('');
                    setTaste(0);
                    setLocation(0);
                    setCoziness(0);
                  }}
                >
                  <Text style={styles.submitText}>Submit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: '#6b7280' }]}
                  onPress={() => setShowReview(false)}
                >
                  <Text style={styles.submitText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.modalSuccess}>
                <Text style={styles.modalTitle}>Thank you!</Text>
                <Text style={styles.modalHelper}>
                  Your review has been submitted.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    { backgroundColor: '#007AFF', marginTop: 12 },
                  ]}
                  onPress={() => setShowReview(false)}
                >
                  <Text style={styles.submitText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

