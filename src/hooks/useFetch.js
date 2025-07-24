import React, { useEffect, useState } from 'react';

const useFetch = (url) => {
    console.log(url)
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    useEffect(()=>{
        if (!url) {
            setError("Please set URL for fetch on data")
            setLoading(false)
            return
        }
        const fetchData = async () =>{
            try{
                setLoading(true)
                const res = await fetch(`http://localhost:3000/api/v1${url}`)
                if(!res.ok) throw new Error("Failed to fetch")
                const data = await res.json()
                setData(data)
                setError(null)
            }catch(err){
                console.log(err)
            }finally{
                setLoading(false)
            }
        }
        fetchData()
    },[url])
    return {data,loading,error}
};

export default useFetch;