import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { Container, Row, Col, Spinner, Button, Modal, Form } from 'react-bootstrap';
import { Image as ImageIcon, CheckCircle, Plus, FolderPlus, X, Star, Trash2 } from 'lucide-react';
import api, { triggerScan } from '../api';

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
    
    // Selection State
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showAlbumModal, setShowAlbumModal] = useState(false);
    const [allAlbums, setAllAlbums] = useState([]);
    const [targetAlbumId, setTargetAlbumId] = useState("");
    const [newAlbumName, setNewAlbumName] = useState("");
    const [isCreatingNew, setIsCreatingNew] = useState(false);

    // Viewer State
    const [person, setPerson] = useState(null);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [currentViewerIndex, setCurrentViewerIndex] = useState(0);
    const [viewerScale, setViewerScale] = useState(1);
    const [viewerRotation, setViewerRotation] = useState(0);

    const toggleSelection = (imgId) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(imgId)) {
            newSelected.delete(imgId);
        } else {
            newSelected.add(imgId);
        }
        setSelectedIds(newSelected);
    };

    const handleAddToAlbum = async () => {
        try {
            const res = await api.get('/albums');
            setAllAlbums(res.data);
            setShowAlbumModal(true);
        } catch (error) {
            console.error("Failed to load albums", error);
        }
    };

    const submitAddToAlbum = async (e) => {
        e.preventDefault();
        const imageIds = Array.from(selectedIds);
        try {
            let albumId = targetAlbumId;
            if (isCreatingNew) {
                const res = await api.post('/albums', { name: newAlbumName });
                albumId = res.data.id;
            }
            
            await api.post(`/albums/${albumId}/photos`, imageIds);
            
            // Clean up
            setIsSelectMode(false);
            setSelectedIds(new Set());
            setShowAlbumModal(false);
            setTargetAlbumId("");
            setNewAlbumName("");
            setIsCreatingNew(false);
            alert(`Added ${imageIds.length} photos to album!`);
        } catch (error) {
            console.error("Failed to add photos to album", error);
            alert("Failed to add photos");
        }
    };

    const handleSetCover = async () => {
        if (selectedIds.size !== 1) return;
        const imageId = Array.from(selectedIds)[0];
        try {
            await api.patch(`/albums/${id}`, { cover_image_id: imageId });
            alert("Album cover updated!");
            setIsSelectMode(false);
            setSelectedIds(new Set());
        } catch (error) {
            console.error("Set cover failed", error);
        }
    };

    const handleRemoveFromAlbum = async () => {
        if (!id || view !== 'album') return;
        if (!window.confirm(`Remove ${selectedIds.size} photos from this album?`)) return;
        
        const imageIds = Array.from(selectedIds);
        try {
            await api.delete(`/albums/${id}/photos`, { data: imageIds });
            
            setImages(prev => prev.filter(img => !selectedIds.has(img.id)));
            setIsSelectMode(false);
            setSelectedIds(new Set());
        } catch (error) {
            console.error("Removal failed", error);
        }
    };

    // Data Hooks
    const { 
        images, loading, loadingPrevious, hasMore, hasMorePrevious, 
        loadMore, loadPrevious, fetchImages, setImages
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

    const handleStartScan = async () => {
        try {
            await triggerScan();
            alert("Scan started successfully! New photos will appear shortly.");
        } catch (error) {
            console.error("Scan trigger failed", error);
            alert("Failed to start scan. Please check if backend is running.");
        }
    };

    return (
        <>
            <div className="position-relative">
                <GalleryToolbar 
                    title={getTitle()} 
                    sortOrder={sortOrder} 
                    setSortOrder={setSortOrder} 
                    count={images.length} 
                    isSelectMode={isSelectMode}
                    onToggleSelectMode={() => {
                        setIsSelectMode(!isSelectMode);
                        setSelectedIds(new Set());
                    }}
                />

                <div className="gallery-content-area">
                    <div ref={topObserverTarget} className="text-center py-2" style={{ minHeight: '20px' }}>
                        {loadingPrevious && <Spinner size="sm" animation="border" variant="secondary"/>}
                    </div>
                    
                    {images.length === 0 && !loading ? (
                            <div className="text-center py-5 text-muted fade-in" style={{ marginTop: '100px' }}>
                                <div className="mb-4 opacity-50">
                                    <ImageIcon size={64} />
                                </div>
                                <h4 className="fw-bold text-white">No photos found</h4>
                                <p className="text-white-50">Your library seems empty. Start by scanning a folder.</p>
                                <Button variant="primary" className="mt-3 px-4 rounded-pill shadow" onClick={handleStartScan}>
                                    Start Scanning
                                </Button>
                        </div>
                    ) : (
                        <PhotoGrid 
                            images={images} 
                            sortOrder={sortOrder} 
                            onImageClick={isSelectMode ? null : handleImageClick} 
                            isSelectMode={isSelectMode}
                            selectedIds={selectedIds}
                            onToggleSelection={toggleSelection}
                        />
                    )}
                    
                    <div ref={bottomObserverTarget} className="text-center py-4" style={{ minHeight: '100px' }}>
                        {loading && (
                            <div className="d-flex flex-column align-items-center gap-2">
                                <Spinner animation="grow" size="sm" variant="primary" />
                                <span className="small text-white-50">Loading more memories...</span>
                            </div>
                        )}
                        {!hasMore && images.length > 0 && <p className="text-white-25 mt-4 small fw-medium tracking-widest text-uppercase">End of Journey</p>}
                    </div>
                </div>
                
                <TimelineSidebar 
                    timeline={timeline} 
                    possibleKeys={groupedKeys} 
                    onJump={scrollToSection} 
                />

                {isSelectMode && selectedIds.size > 0 && (
                    <div className="position-fixed bottom-0 start-50 translate-middle-x mb-4 z-index-modal" style={{ zIndex: 1050 }}>
                        <div className="glass-panel px-4 py-3 rounded-pill shadow-lg d-flex align-items-center gap-4 border border-primary border-opacity-20 animate-slide-up bg-black bg-opacity-80" style={{ backdropFilter: 'blur(20px)' }}>
                            <div className="d-flex align-items-center gap-2">
                                <span className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '28px', height: '28px', fontSize: '0.8rem' }}>
                                    {selectedIds.size}
                                </span>
                                <span className="text-white fw-medium">selected</span>
                            </div>
                            <div className="vr bg-white opacity-20" style={{ height: '24px' }}></div>
                            {view === 'album' ? (
                                <>
                                    {selectedIds.size === 1 && (
                                        <Button 
                                            variant="outline-warning" 
                                            className="rounded-pill px-3 py-2 d-flex align-items-center gap-2 border-0"
                                            onClick={handleSetCover}
                                            style={{ backgroundColor: 'rgba(255, 193, 7, 0.1)', color: '#ffc107' }}
                                        >
                                            <Star size={18} />
                                            Set as Cover
                                        </Button>
                                    )}
                                    <Button 
                                        variant="outline-danger" 
                                        className="rounded-pill px-3 py-2 d-flex align-items-center gap-2 border-0"
                                        onClick={handleRemoveFromAlbum}
                                        style={{ backgroundColor: 'rgba(220, 53, 69, 0.1)', color: '#dc3545' }}
                                    >
                                        <Trash2 size={18} />
                                        Remove
                                    </Button>
                                </>
                            ) : (
                                <Button 
                                    variant="primary" 
                                    className="rounded-pill px-4 py-2 d-flex align-items-center gap-2 shadow"
                                    onClick={handleAddToAlbum}
                                >
                                    <FolderPlus size={18} />
                                    Add to Album
                                </Button>
                            )}
                            <Button 
                                variant="link" 
                                className="text-white-50 p-0 text-decoration-none"
                                onClick={() => setSelectedIds(new Set())}
                            >
                                Deselect All
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <Modal show={showAlbumModal} onHide={() => setShowAlbumModal(false)} centered className="glass-modal">
                <div className="glass-panel p-4 border border-white border-opacity-10 rounded-4 shadow-2xl">
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="text-white fw-bold">Add to Album</Modal.Title>
                    </Modal.Header>
                    <Form onSubmit={submitAddToAlbum}>
                        <Modal.Body className="pt-4">
                            <p className="text-white-50 small mb-4">You have selected {selectedIds.size} photos to organize.</p>
                            
                            <div className="d-flex gap-2 mb-4">
                                <Button 
                                    variant={!isCreatingNew ? "primary" : "outline-secondary"} 
                                    className="flex-grow-1 rounded-3 py-2"
                                    onClick={() => setIsCreatingNew(false)}
                                >
                                    Existing Album
                                </Button>
                                <Button 
                                    variant={isCreatingNew ? "primary" : "outline-secondary"} 
                                    className="flex-grow-1 rounded-3 py-2"
                                    onClick={() => setIsCreatingNew(true)}
                                >
                                    Create New
                                </Button>
                            </div>

                            {isCreatingNew ? (
                                <Form.Group>
                                    <Form.Label className="text-white-50 small mb-2 uppercase tracking-wide fw-semibold" style={{ fontSize: '10px' }}>New Album Name</Form.Label>
                                    <Form.Control 
                                        required
                                        value={newAlbumName}
                                        onChange={(e) => setNewAlbumName(e.target.value)}
                                        placeholder="Bucket List Trip..."
                                        className="bg-white bg-opacity-5 border-0 text-white rounded-3 py-2 px-3 shadow-none focus-primary"
                                        autoFocus
                                    />
                                </Form.Group>
                            ) : (
                                <Form.Group>
                                    <Form.Label className="text-white-50 small mb-2 uppercase tracking-wide fw-semibold" style={{ fontSize: '10px' }}>Select Destination</Form.Label>
                                    <Form.Select 
                                        required
                                        value={targetAlbumId}
                                        onChange={(e) => setTargetAlbumId(e.target.value)}
                                        className="bg-white bg-opacity-5 border-0 text-white rounded-3 py-2 px-3 shadow-none focus-primary"
                                    >
                                        <option value="" disabled className="bg-dark">Choose an album...</option>
                                        {allAlbums.map(a => (
                                            <option key={a.id} value={a.id} className="bg-dark">{a.name} ({a.image_count} items)</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            )}
                        </Modal.Body>
                        <Modal.Footer className="border-0 pt-4 pb-0 justify-content-end gap-2">
                            <Button variant="link" className="text-white-50 text-decoration-none px-4" onClick={() => setShowAlbumModal(false)}>Cancel</Button>
                            <Button variant="primary" type="submit" className="rounded-pill px-5 shadow">Confirm</Button>
                        </Modal.Footer>
                    </Form>
                </div>
            </Modal>

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
        </>
    );
};

export default Gallery;
