import { useState, useEffect } from 'react';
import api from '../api';

export const useTimeline = () => {
    const [timeline, setTimeline] = useState([]);

    useEffect(() => {
        api.get('/images/timeline')
           .then(res => setTimeline(res.data))
           .catch(err => console.error("Failed to fetch timeline", err));
    }, []);

    return timeline;
};
