import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api/api.js';

const useGetProducts = () => {
  const [products, setProducts] = useState([]); 
  const [error, setError] = useState(null); 
  const [loading, setLoading] = useState(true); 
  const [loadingMore,setLoadingMore]=useState(false);
  const [total,setTotal]=useState(0);
  const [nextOffset,setNextOffset]=useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/api/products');
      setProducts(data.items||[]);
      setTotal(data.total||0);setNextOffset(data.nextOffset);
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

  const loadMore=async()=>{
    if(nextOffset===null||loadingMore)return;
    setLoadingMore(true);
    try{const data=await apiRequest('/api/products?offset='+nextOffset);setProducts(old=>[...old,...data.items]);setNextOffset(data.nextOffset);setTotal(data.total);}
    catch(e){setError(e.message);}finally{setLoadingMore(false);}
  };
  return { products, total,hasMore:nextOffset!==null,loadMore,loadingMore,error, loading, reloadProducts: fetchProducts };
};

export default useGetProducts;
