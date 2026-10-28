// Hook that GETs a url through client.js and returns { data, loading, error, reload }.
// Used by the list pages; errors show as a toast unless the page passes toast: false.
import { useCallback, useEffect, useState } from 'react';
import { App } from 'antd';
import api, { errorMessage } from './client';

export default function useApi(url, { params, delay = 0, toast = true } = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { message } = App.useApp();
  // Compare params as a string, so a new object on every render doesn't trigger a reload.
  const query = JSON.stringify(params || {});

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(url, { params: JSON.parse(query) });
      setData(response.data);
    } catch (err) {
      setError(errorMessage(err));
      if (toast) message.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [url, query, toast, message]);

  useEffect(() => {
    const timer = setTimeout(reload, delay);
    return () => clearTimeout(timer);
  }, [reload, delay]);

  return { data, loading, error, reload };
}
