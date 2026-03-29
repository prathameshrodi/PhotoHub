import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Row, Col, Spinner } from 'react-bootstrap';
import api from '../api';

// Custom Hooks
import { useImages } from '../hooks/useImages';
import { useTimeline } from '../hooks/useTimeline';

// Components
import GalleryToolbar from './Gallery/GalleryToolbar';
import TimelineSidebar from './Gallery/TimelineSidebar';
import PhotoGrid from './Gallery/PhotoGrid';
import ImageViewer from './ImageViewer';

const Gallery = ({ view }) => {
    const { id, locationName } = useParams();
    const [sortOrder, setSortOrder] = useState('desc');
    
    // Viewer State
    const [person, setPerson] = useState(null);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [currentViewerIndex, setCurrentViewerIndex] = useState(0);
    const [viewerScale, setViewerScale] = useState(1);
    const [viewerRotation, setViewerRotation] = useState(0);

    // Data Hooks
    const { 
        images, loading, loadingPrevious, hasMore, hasMorePrevious, 
        loadMore, loadPrevious, fetchImages 
    } = useImages(view, id, locationName, sortOrder);

    const timeline = useTimeline();

    // Intersection Observers
    const bottomObserverTarget = useRef(null);
    const topObserverTarget = useRef(null);

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
            { threshold: 0.1 }
        );

        if (bottomObserverTarget.current) observer.observe(bottomObserverTarget.current);
        if (topObserverTarget.current) topObserver.observe(topObserverTarget.current);

        return () => {
             observer.disconnect();
             topObserver.disconnect();
        };
    }, [hasMore, loading, loadMore, hasMorePrevious, loadingPrevious, loadPrevious]);

    // Fetch Person details
    useEffect(() => {
        if (id && (!view || view === 'person')) {
            api.get(`/people/${id}`)
               .then(res => setPerson(res.data))
               .catch(err => console.error("Failed to fetch person", err));
        }
    }, [id, view]);

    const getTitle = () => {
        if (view === 'location') return locationName ? decodeURIComponent(locationName) : 'Location';
        if (id) return person ? person.name : 'Person';
        return 'Library';
    };

    // Calculate groups for timeline sidebar fallback
    const groupedKeys = useMemo(() => {
        const keys = new Set();
        images.forEach(img => {
            const date = new Date(img.capture_date || img.timestamp);
            keys.add(date.toLocaleString('default', { month: 'long', year: 'numeric' }));
        });
        return Array.from(keys);
    }, [images]);

    const handleImageClick = (img) => {
        // Need index in the *current* list.
        // PhotoGrid uses sorted list, but useImages returns list.
        // PhotoGrid sorts internally? Yes.
        // We should sort here to sync with Viewer.
        const sorted = [...images].sort((a, b) => {
             const dateA = new Date(a.capture_date || a.timestamp);
             const dateB = new Date(b.capture_date || b.timestamp);
             return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        const index = sorted.findIndex(i => i.id === img.id);
        setCurrentViewerIndex(index >= 0 ? index : 0);
        setViewerScale(1);
        setViewerRotation(0);
        setViewerOpen(true);
    };
    
    // Need sorted images for Viewer
    const sortedImages = useMemo(() => {
         return [...images].sort((a, b) => {
             const dateA = new Date(a.capture_date || a.timestamp);
             const dateB = new Date(b.capture_date || b.timestamp);
             return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
    }, [images, sortOrder]);

    const scrollToSection = async (key) => {
        const element = document.getElementById(key);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        } else {
             try {
                const parts = key.split(' ');
                const monthName = parts[0];
                const year = parts[1];
                const months = {
                    'January': '01', 'February': '02', 'March': '03', 'April': '04', 
                    'May': '05', 'June': '06', 'July': '07', 'August': '08', 
                    'September': '09', 'October': '10', 'November': '11', 'December': '12'
                };
                const month = months[monthName];
                const dateStr = `${year}-${month}`;
                
                // Need manual Loading state triggers? 
                // fetchImages handles loading state internally but exposed.
                // But we are calling it awaited.
                
                const res = await api.get('/images/date-offset', { 
                    params: { date: dateStr, sort_order: sortOrder } 
                });
                
                const newOffset = res.data.offset;
                await fetchImages(newOffset, 'replace');
                
                requestAnimationFrame(() => {
                    const scrollContainer = document.querySelector('main'); 
                    if (scrollContainer) scrollContainer.scrollTop = 0;
                    setTimeout(() => {
                        const el = document.getElementById(key);
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                });
            } catch (error) {
                console.error("Jump failed", error);
            }
        }
    };

    return (
        <Container fluid>
            <GalleryToolbar 
                title={getTitle()} 
                sortOrder={sortOrder} 
                setSortOrder={setSortOrder} 
                count={images.length} 
            />

            <Row>
                <Col md={10}>
                    <div ref={topObserverTarget} className="text-center py-2" style={{ minHeight: '20px' }}>
                        {loadingPrevious && <Spinner size="sm" animation="border" variant="secondary"/>}
                    </div>
                    
                    {images.length === 0 && !loading ? (
                         <div className="text-center py-5 text-muted">
                             <h4>No photos found</h4>
                             <p>Try scanning your library.</p>
                        </div>
                    ) : (
                        <PhotoGrid 
                            images={images} 
                            sortOrder={sortOrder} 
                            onImageClick={handleImageClick} 
                        />
                    )}
                    
                    <div ref={bottomObserverTarget} className="text-center py-4" style={{ minHeight: '50px' }}>
                        {loading && <Spinner animation="border" variant="primary" />}
                        {!hasMore && images.length > 0 && <p className="text-muted mt-2">No more photos</p>}
                    </div>
                </Col>
                
                <TimelineSidebar 
                    timeline={timeline} 
                    possibleKeys={groupedKeys} 
                    onJump={scrollToSection} 
                />
            </Row>

            <ImageViewer 
                show={viewerOpen}
                onClose={() => setViewerOpen(false)}
                images={sortedImages}
                currentIndex={currentViewerIndex}
                onNavigate={setCurrentViewerIndex}
                scale={viewerScale}
                rotation={viewerRotation}
                setScale={setViewerScale}
                setRotation={setViewerRotation}
            />
        </Container>
    );
};

export default Gallery;
