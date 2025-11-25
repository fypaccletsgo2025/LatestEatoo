import { useEffect, useState } from 'react';
import { getCatalog } from '../services/catalogService';

export function useCatalogData(options = {}) {
  const { includeRestaurants = true, includeItems = true, force = false } = options;
  const [restaurants, setRestaurants] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCatalog({ force })
      .then((data) => {
        if (cancelled) return;
        if (includeRestaurants) setRestaurants(data.restaurants);
        if (includeItems) setItems(data.items);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || 'Failed to load catalog data.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [includeItems, includeRestaurants, force]);

  return {
    restaurants: includeRestaurants ? restaurants : [],
    items: includeItems ? items : [],
    loading,
    error,
  };
}
