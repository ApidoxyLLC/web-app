import React, { useEffect, useState, useCallback } from 'react';

const useFetch = (url) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchData = useCallback(async () => {
        if (!url) {
            setError("Please set URL for fetch on data");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/v1${url}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setData(data.data);
            setError(null);
        } catch (err) {
            console.log(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [url]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Return the refetch function that can be called to refresh the data
    const refetch = useCallback(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch };
};

export default useFetch;