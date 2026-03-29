import { useState, useCallback, useEffect, useRef } from 'react';
import api from '../api';

export const useImages = (view, id, locationName, sortOrder) => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingPrevious, setLoadingPrevious] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [hasMorePrevious, setHasMorePrevious] = useState(false);
    const [offset, setOffset] = useState(0);
    
    // Use Ref to track startOffset to avoid dependency loops/stale closures in useCallback
    const startOffsetRef = useRef(0);
    
    const limit = 50;

    const fetchImages = useCallback(async (currentOffset, mode = 'append') => {
        if (mode === 'prepend') setLoadingPrevious(true);
        else setLoading(true);

        try {
            let endpoint = '/images';
            let params = { 
                offset: currentOffset, 
                limit: limit, 
                sort_order: sortOrder 
            };

            if (view === 'location' && locationName) {
                params.location = decodeURIComponent(locationName);
            } else if (id) {
                 endpoint = `/people/${id}/images`;
            }

            const response = await api.get(endpoint, { params });
            const newImages = response.data;
            
            if (mode === 'replace') {
                setHasMore(newImages.length >= limit);
                setImages(newImages);
                setOffset(currentOffset + limit);
                
                startOffsetRef.current = currentOffset;
                setHasMorePrevious(currentOffset > 0);
            } else if (mode === 'prepend') {
                if (newImages.length > 0) {
                     const scrollContainer = document.querySelector('main');
                     const oldScrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;
                     const oldScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

                     setImages(prev => [...newImages, ...prev]);
                     
                     startOffsetRef.current = currentOffset;
                     setHasMorePrevious(currentOffset > 0);
                     
                     requestAnimationFrame(() => {
                        if (scrollContainer) {
                            const newScrollHeight = scrollContainer.scrollHeight;
                            const diff = newScrollHeight - oldScrollHeight;
                            scrollContainer.scrollTop = oldScrollTop + diff;
                        }
                     });
                } else {
                    setHasMorePrevious(false);
                }
            } else {
                // Append
                setHasMore(newImages.length >= limit);
                setImages(prev => [...prev, ...newImages]);
                setOffset(currentOffset + limit);
                
                // Use ref value
                setHasMorePrevious(startOffsetRef.current > 0);
            }
        } catch (error) {
            console.error('Error fetching images:', error);
        } finally {
            setLoading(false);
            setLoadingPrevious(false);
        }
    }, [id, view, locationName, sortOrder]);

    const loadMore = useCallback(() => {
        if (!loading && hasMore) {
            fetchImages(offset, 'append');
        }
    }, [loading, hasMore, offset, fetchImages]);

    const loadPrevious = useCallback(() => {
        if (!loadingPrevious && startOffsetRef.current > 0) {
            const nextStart = Math.max(0, startOffsetRef.current - limit);
            fetchImages(nextStart, 'prepend');
        }
    }, [loadingPrevious, fetchImages]);
    
    // Initial Load
    useEffect(() => {
        fetchImages(0, 'replace');
    }, [fetchImages]);

    return {
        images,
        loading,
        loadingPrevious,
        hasMore,
        hasMorePrevious,
        loadMore,
        loadPrevious,
        fetchImages, 
        setImages
    };
};
