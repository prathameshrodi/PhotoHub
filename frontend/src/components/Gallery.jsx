import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { Container, Row, Col, Card, Spinner, Form, Badge } from 'react-bootstrap';
import { Calendar, MapPin } from 'lucide-react';
import ImageViewer from './ImageViewer';

const Gallery = ({ view }) => {
    const { id, locationName } = useParams();
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc' or 'asc'
    const [offset, setOffset] = useState(0);
    const [startOffset, setStartOffset] = useState(0); // Track start index for "Load Previous"
    const [hasMore, setHasMore] = useState(true);
    const [loadingPrevious, setLoadingPrevious] = useState(false);
    const limit = 50;


    const [hasMorePrevious, setHasMorePrevious] = useState(false);
    
    const [person, setPerson] = useState(null);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [currentViewerIndex, setCurrentViewerIndex] = useState(0);
    const [viewerScale, setViewerScale] = useState(1);
    const [viewerRotation, setViewerRotation] = useState(0);

    const [timeline, setTimeline] = useState([]);

    const fetchImages = useCallback(async (currentOffset, mode = 'append') => {
        // mode: 'append' (default), 'prepend', 'replace'
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
                if (newImages.length < limit) setHasMore(false);
                else setHasMore(true);
                
                setImages(newImages);
                setOffset(currentOffset + limit);
                setStartOffset(currentOffset);
                setHasMorePrevious(currentOffset > 0);
            } else if (mode === 'prepend') {
                if (newImages.length > 0) {
                     // Capture current scroll height
                     const scrollContainer = document.querySelector('main'); // Assuming Main layout
                     const oldScrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;
                     const oldScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

                     setImages(prev => [...newImages, ...prev]);
                     setStartOffset(currentOffset);
                     setHasMorePrevious(currentOffset > 0);
                     
                     // Restore scroll position after render (handled in useLayoutEffect ideally, but here roughly)
                     // We need to wait for DOM update.
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
                if (newImages.length < limit) setHasMore(false);
                else setHasMore(true);

                setImages(prev => [...prev, ...newImages]);
                setOffset(currentOffset + limit);
                setHasMorePrevious(startOffset > 0);
            }
        } catch (error) {
            console.error('Error fetching images:', error);
        } finally {
            setLoading(false);
            setLoadingPrevious(false);
        }
    }, [id, view, locationName, sortOrder]); // Removed startOffset dependency to prevents re-triggering useEffect

    // Remove unused containerRef
    // const containerRef = React.useRef(null);

    // Initial load and reset when view/filter changes
    useEffect(() => {
        // We rely on fetchImages(0, true) to reset images and handle loading
        fetchImages(0, 'replace');
        
        // Fetch Timeline 
        api.get('/images/timeline')
           .then(res => setTimeline(res.data))
           .catch(err => console.error("Failed to fetch timeline", err));
        
        if (id && (!view || view === 'person')) {
            api.get(`/people/${id}`)
               .then(res => setPerson(res.data))
               .catch(err => console.error("Failed to fetch person", err));
        }
    }, [id, locationName, view, sortOrder, fetchImages]);

    const loadMore = useCallback(() => {
        if (!loading && hasMore) {
            fetchImages(offset, 'append');
        }
    }, [loading, hasMore, offset, fetchImages]);

    const loadPrevious = useCallback(() => {
        if (!loadingPrevious && startOffset > 0) {
            const nextStart = Math.max(0, startOffset - limit);
            fetchImages(nextStart, 'prepend');
        }
    }, [loadingPrevious, startOffset, fetchImages]);

    // Intersection Observer
    const observerTarget = React.useRef(null);
    const topObserverTarget = React.useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    loadMore();
                }
            },
            { threshold: 0.5 }
        );

        const topObserver = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMorePrevious && !loadingPrevious) {
                    loadPrevious();
                }
            },
            { threshold: 0.1 } // Trigger as soon as top sentinel is visible
        );

        const currentTarget = observerTarget.current;
        const currentTopTarget = topObserverTarget.current;

        if (currentTarget) observer.observe(currentTarget);
        if (currentTopTarget) topObserver.observe(currentTopTarget);

        return () => {
            if (currentTarget) observer.unobserve(currentTarget);
            if (currentTopTarget) topObserver.unobserve(currentTopTarget);
        };
    }, [hasMore, loading, loadMore, hasMorePrevious, loadingPrevious, loadPrevious]);

    const getTitle = () => {
        if (view === 'location') return locationName ? decodeURIComponent(locationName) : 'Location';
        if (id) return person ? person.name : 'Person';
        return 'Library';
    };

    // Group images by Year-Month
    const { groups: groupedImages, sortedImages } = useMemo(() => {
        const sorted = [...images].sort((a, b) => {
            const dateA = new Date(a.capture_date || a.timestamp);
            const dateB = new Date(b.capture_date || b.timestamp);
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        const groups = {};
        sorted.forEach(img => {
            const date = new Date(img.capture_date || img.timestamp);
            const key = date.toLocaleString('default', { month: 'long', year: 'numeric' }); 
            if (!groups[key]) groups[key] = [];
            groups[key].push(img);
        });
        return { groups, sortedImages: sorted };
    }, [images, sortOrder]);

    const handleImageClick = (img) => {
        const index = sortedImages.findIndex(i => i.id === img.id);
        setCurrentViewerIndex(index >= 0 ? index : 0);
        setViewerScale(1);
        setViewerRotation(0);
        setViewerOpen(true);
    };

    const handleViewerNavigate = (index) => {
        setCurrentViewerIndex(index);
        setViewerScale(1);
        setViewerRotation(0);
    };

    const scrollToSection = async (key) => {
        const element = document.getElementById(key);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Jump to date
            // need to find offset from backend
            try {
                // Parse "December 2025" -> "2025-12"
                const parts = key.split(' ');
                const monthName = parts[0];
                const year = parts[1];
                const months = {
                    'January': '01', 'February': '02', 'March': '03', 'April': '04', 
                    'May': '05', 'June': '06', 'July': '07', 'August': '08', 
                    'September': '09', 'October': '10', 'November': '11', 'December': '12'
                };
                const month = months[monthName];
                const dateStr = `${year}-${month}`; // YYYY-MM
                
                setLoading(true);
                const res = await api.get('/images/date-offset', { 
                    params: { date: dateStr, sort_order: sortOrder } 
                });
                
                const newOffset = res.data.offset;
                await fetchImages(newOffset, 'replace');
                
                // CRITICALLY IMPORTANT: Reset scroll to top immediately to prevent
                // "loadMore" observer from triggering infinitely if we were scrolled down.
                // We trust "replace" to set new data, and we want to see the START of that data.
                requestAnimationFrame(() => {
                    const scrollContainer = document.querySelector('main'); 
                    if (scrollContainer) scrollContainer.scrollTop = 0;
                    
                    // Optional: Try to smooth scroll to the specific header if it exists now
                    setTimeout(() => {
                        const el = document.getElementById(key);
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                });
            } catch (error) {
                console.error("Jump failed", error);
                setLoading(false);
            }
        }
    };

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold mb-0">
                    {getTitle()}
                </h2>
                <div className="d-flex align-items-center gap-3">
                    <Form.Select 
                        value={sortOrder} 
                        onChange={(e) => setSortOrder(e.target.value)}
                        style={{ width: 'auto' }}
                    >
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                    </Form.Select>
                    <Badge bg="secondary" pill>{images.length} items</Badge>
                </div>
            </div>

            <Row>
                <Col md={10}>
                    {/* Top Loading Sentinel */}
                    <div ref={topObserverTarget} className="text-center py-2" style={{ minHeight: '20px' }}>
                        {loadingPrevious && <Spinner size="sm" animation="border" variant="secondary"/>}
                    </div>
                    
                    {Object.keys(groupedImages).length === 0 && !loading ? (
                        <div className="text-center py-5 text-muted">
                             <h4>No photos found</h4>
                             <p>Try scanning your library.</p>
                        </div>
                    ) : (
                        Object.entries(groupedImages).map(([groupKey, groupPhotos]) => (
                            <div key={groupKey} id={groupKey} className="mb-5">
                                <h4 className="text-muted mb-3 border-bottom pb-2 sticky-top bg-white" style={{ top: '0px', zIndex: 10 }}>
                                    {groupKey}
                                </h4>
                                <Row xs={2} md={4} lg={5} xl={6} className="g-3">
                                    {groupPhotos.map((img) => (
                                        <Col key={img.id}>
                                            <Card 
                                                className="h-100 border-0 shadow-sm photo-card"
                                                onClick={() => handleImageClick(img)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div className="ratio ratio-1x1 overflow-hidden rounded">
                                                    <Card.Img 
                                                        variant="top" 
                                                        src={img.thumbnail || `http://localhost:8000/images/content/${img.id}`} 
                                                        alt={img.filename}
                                                        className="object-fit-cover"
                                                        loading="lazy"
                                                        style={{ transition: 'transform 0.3s' }}
                                                    />
                                                </div>
                                                <div className="mt-1 small text-muted d-flex justify-content-between align-items-center">
                                                    <span>{new Date(img.capture_date || img.timestamp).getDate()}</span>
                                                    {img.location && (
                                                        <span className="text-truncate" style={{ maxWidth: '80%' }} title={img.location}>
                                                            <MapPin size={12} className="me-1"/>
                                                            {img.location.split(',')[0]}
                                                        </span>
                                                    )}
                                                </div>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            </div>
                        ))
                    )}
                    
                    {/* Loading State & Infinite Scroll Target */}
                    <div ref={observerTarget} className="text-center py-4" style={{ minHeight: '50px' }}>
                        {loading && <Spinner animation="border" variant="primary" />}
                        {!hasMore && images.length > 0 && <p className="text-muted mt-2">No more photos</p>}
                    </div>

                </Col>
                
                {/* Timeline Sidebar (Sticky) */}
                <Col md={2} className="d-none d-md-block">
                    <div className="sticky-top" style={{ top: '100px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div className="d-flex flex-column gap-1 border-start ps-3">
                            {/* If we have a timeline from API, use that. Else fallback to loaded groups? 
                                User asked to load possible months. So we prioritizing timeline state.
                            */}
                            {(timeline.length > 0 ? timeline : Object.keys(groupedImages)).map(key => (
                                <small 
                                    key={key} 
                                    className="text-muted cursor-pointer hover-text-primary" 
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => scrollToSection(key)}
                                >
                                    {key}
                                </small>
                            ))}
                        </div>
                    </div>
                </Col>
            </Row>
            
            <style>{`
                .photo-card:hover img {
                    transform: scale(1.05);
                }
                .hover-text-primary:hover {
                    color: var(--bs-primary) !important;
                    font-weight: bold;
                }
            `}</style>
            
            <ImageViewer 
                show={viewerOpen}
                onClose={() => setViewerOpen(false)}
                images={sortedImages}
                currentIndex={currentViewerIndex}
                onNavigate={handleViewerNavigate}
                scale={viewerScale}
                rotation={viewerRotation}
                setScale={setViewerScale}
                setRotation={setViewerRotation}
            />
        </Container>
    );
};

export default Gallery;
