import React, { useEffect, useState } from 'react';
import api from '../api';
import { MapPin, ArrowRight, Grid, CheckSquare, X, CheckCircle, FolderPlus } from 'lucide-react';
import { Row, Col, Spinner, Badge, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../api';

const Locations = () => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    const toggleSelection = (name, e) => {
        if (!isSelectMode) return;
        e.preventDefault();
        e.stopPropagation();
        const newSelected = new Set(selectedIds);
        if (newSelected.has(name)) {
            newSelected.delete(name);
        } else {
            newSelected.add(name);
        }
        setSelectedIds(newSelected);
    };

    useEffect(() => {
        api.get('/locations')
           .then(res => setLocations(res.data))
           .catch(err => console.error("Failed to fetch locations", err))
           .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
             <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
                <Spinner animation="grow" variant="primary" />
            </div>
        );
    }

    return (
        <div className="fade-in">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
                <div>
                    <h2 className="fw-bold text-white mb-1 d-flex align-items-center gap-2">
                        <MapPin size={28} className="text-primary" />
                        Places
                    </h2>
                    <p className="text-white-50 mb-0">Browse your memories by geography</p>
                </div>

                <div className="d-flex align-items-center gap-2">
                    {isSelectMode ? (
                        <>
                            <Button 
                                variant="danger" 
                                className="rounded-pill px-4 d-flex align-items-center gap-2 border-0"
                                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                                onClick={() => { setIsSelectMode(false); setSelectedIds(new Set()); }}
                            >
                                <X size={18} />
                                <span className="fw-medium">Cancel</span>
                            </Button>
                            {selectedIds.size > 0 && (
                                <Button 
                                    variant="primary" 
                                    className="rounded-pill px-4 shadow-sm d-flex align-items-center gap-2"
                                    onClick={() => alert("Organizing locations...")}
                                >
                                    <FolderPlus size={18} />
                                    Review ({selectedIds.size})
                                </Button>
                            )}
                        </>
                    ) : (
                        <Button 
                            variant="outline-primary" 
                            className="rounded-pill px-4 py-2 d-flex align-items-center gap-2 border-0"
                            style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}
                            onClick={() => setIsSelectMode(true)}
                        >
                            <CheckSquare size={18} />
                            <span className="fw-medium">Select</span>
                        </Button>
                    )}
                </div>
            </div>

            {locations.length === 0 ? (
                 <div className="text-center py-5 glass-panel rounded-4">
                    <div className="mb-3 opacity-25"><MapPin size={48} /></div>
                    <h5 className="text-white-50">No location data found yet.</h5>
                    <p className="small text-white-25">Photos with GPS data will automatically appear here after scanning.</p>
                 </div>
            ) : (
                <Row xs={1} sm={2} lg={3} xl={4} className="g-4">
                    {locations.map((loc, idx) => {
                        const coverSrc = loc.cover_photo 
                            ? (loc.cover_photo.startsWith('data:') || loc.cover_photo.startsWith('http') ? loc.cover_photo : `${API_BASE_URL}/${loc.cover_photo.replace(/^\//, '')}`)
                            : 'https://images.unsplash.com/photo-1524850011238-e3d235c7d4c9?q=80&w=500&auto=format&fit=crop';
                        
                        const isSelected = selectedIds.has(loc.name);
                        return (
                            <Col key={idx}>
                                 <div 
                                    onClick={(e) => isSelectMode && toggleSelection(loc.name, e)}
                                    className={`${isSelectMode ? 'cursor-pointer' : ''}`}
                                 >
                                     <Link to={isSelectMode ? '#' : `/locations/${encodeURIComponent(loc.name)}`} className="text-decoration-none shadow-none">
                                        <div className={`location-card-v2 glass-card overflow-hidden position-relative ${isSelected ? 'border-primary' : ''}`} style={{ transition: 'all 0.3s' }}>
                                            <div className="ratio ratio-4x3 overflow-hidden">
                                                <img 
                                                    src={coverSrc} 
                                                    alt={loc.name}
                                                    className={`object-fit-cover transition-transform w-100 h-100 ${isSelected ? 'scale-90 opacity-75' : ''}`}
                                                    loading="lazy"
                                                />
                                                {isSelectMode && (
                                                    <div className={`position-absolute top-0 start-0 m-3 d-flex align-items-center justify-content-center rounded-circle border-2 ${isSelected ? 'bg-primary border-white' : 'bg-black bg-opacity-30 border-white border-opacity-50'}`} style={{ width: '28px', height: '28px', zIndex: 10 }}>
                                                        {isSelected && <CheckCircle size={18} color="white" />}
                                                    </div>
                                                )}
                                            </div>
                                        
                                        <div className="card-overlay position-absolute inset-0 d-flex flex-column justify-content-end p-4"
                                             style={{ background: 'linear-gradient(to top, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.4) 50%, transparent 100%)' }}>
                                            
                                            <div className="d-flex justify-content-between align-items-end">
                                                <div className="overflow-hidden pe-3">
                                                    <h3 className="fs-5 fw-bold text-white mb-1 text-truncate" title={loc.name}>
                                                        {loc.name}
                                                    </h3>
                                                    <div className="d-flex align-items-center gap-2 text-white-50 small">
                                                        <Grid size={12} />
                                                        <span>{loc.count} photos</span>
                                                    </div>
                                                </div>
                                                <div className="arrow-circle bg-primary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '32px', height: '32px' }}>
                                                    <ArrowRight size={16} color="white" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                 </Link>
                                </div>
                            </Col>
                        );
                    })}
                </Row>
            )}
            <style>{`
                .location-card-v2 {
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 20px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .location-card-v2:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1) !important;
                }
                .location-card-v2:hover img {
                    transform: scale(1.1);
                }
                .location-card-v2:hover .arrow-circle {
                    background-color: var(--accent-hover);
                    transform: translateX(4px);
                }
                .arrow-circle {
                    transition: all 0.3s ease;
                }
                .inset-0 {
                    top: 0; left: 0; right: 0; bottom: 0;
                }
            `}</style>
        </div>
    );
};

export default Locations;
