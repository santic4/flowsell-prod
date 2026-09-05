import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api/api.js';

const useGetSavedProducts = () => {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSavedProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/api/products/saved');
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      setError(error.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedProducts();
  }, [fetchSavedProducts]);

  return { products, error, loading, reloadProducts: fetchSavedProducts };
};

export default useGetSavedProducts;
