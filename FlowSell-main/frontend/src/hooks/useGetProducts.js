import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api/api.js';

const useGetProducts = () => {
  const [products, setProducts] = useState([]); 
  const [error, setError] = useState(null); 
  const [loading, setLoading] = useState(true); 

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/api/products');
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, error, loading, reloadProducts: fetchProducts };
};

export default useGetProducts;
