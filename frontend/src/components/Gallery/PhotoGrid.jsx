import React, { useMemo } from 'react';
import { Card } from 'react-bootstrap';
import { MapPin, Calendar, Maximize2, CheckCircle } from 'lucide-react';
import { API_BASE_URL } from '../../api';

const PhotoGrid = ({ images, sortOrder, onImageClick, isSelectMode, selectedIds, onToggleSelection }) => {
    
    const groupedImages = useMemo(() => {
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
        return groups;
    }, [images, sortOrder]);

    if (Object.keys(groupedImages).length === 0) return null;

    const handlePhotoClick = (img, e) => {
        if (isSelectMode) {
            e.preventDefault();
            e.stopPropagation();
            onToggleSelection(img.id);
        } else if (onImageClick) {
            onImageClick(img);
        }
    };

    return (
        <div className="pe-lg-0 container-grid"> {/* Responsive padding */}
            {Object.entries(groupedImages).map(([groupKey, groupPhotos]) => (
                <div key={groupKey} id={groupKey} className="mb-5">
                    <div className="d-flex align-items-center mb-4 gap-3 sticky-top glass-panel-subtle py-2">
                        <h4 className="m-0 fs-5 fw-bold text-white tracking-tight">
                            {groupKey}
                        </h4>
                        <div className="flex-grow-1 bg-secondary opacity-25" style={{ height: '1px' }}></div>
                        <span className="badge bg-secondary-subtle text-white-50 rounded-pill px-3 py-1" style={{ fontSize: '0.75rem' }}>
                            {groupPhotos.length} {groupPhotos.length === 1 ? 'photo' : 'photos'}
                        </span>
                    </div>

                    <div className="d-flex flex-wrap gap-2">
                        {groupPhotos.map((img) => {
                            const isSelected = selectedIds?.has(img.id);
                            return (
                                <div 
                                    key={img.id}
                                    className={`photo-item-container flex-grow-1 position-relative overflow-hidden rounded-4 shadow-sm ${isSelected ? 'selected' : ''}`}
                                    onClick={(e) => handlePhotoClick(img, e)}
                                    style={{ 
                                        transition: 'all 0.3s cubic-bezier(0.17, 0.67, 0.83, 0.67)',
                                        border: isSelected ? '3px solid var(--accent-primary)' : 'none',
                                        cursor: isSelectMode ? 'pointer' : 'zoom-in',
                                    }}
                                >
                                    <img 
                                        src={`${API_BASE_URL}/images/thumbnail/${img.id}`} 
                                        alt={img.filename}
                                        className={`w-100 h-100 object-fit-cover transition-transform ${isSelected ? 'scale-90 opacity-75' : ''}`}
                                        loading="lazy"
                                    />
                                    
                                    {isSelectMode && (
                                        <div className={`selection-pill position-absolute top-0 start-0 m-3 d-flex align-items-center justify-content-center rounded-circle border-2 ${isSelected ? 'bg-primary border-white' : 'bg-black bg-opacity-30 border-white border-opacity-50'}`} style={{ width: '28px', height: '28px', zIndex: 10 }}>
                                            {isSelected && <CheckCircle size={18} color="white" />}
                                        </div>
                                    )}

                                    <div className="photo-overlay position-absolute bottom-0 start-0 end-0 p-3 text-white d-flex flex-column justify-content-end gap-1 opacity-0 transition-opacity" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', height: '100px' }}>
                                        <div className="d-flex justify-content-between align-items-center">
                                           <div className="d-flex flex-column">
                                                <span className="fw-medium small d-flex align-items-center gap-1">
                                                    <Calendar size={12} />
                                                    {new Date(img.capture_date || img.timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                                </span>
                                                {img.location && (
                                                    <span className="tiny-text opacity-75 d-flex align-items-center gap-1">
                                                        <MapPin size={10} />
                                                        {img.location.split(',')[0]}
                                                    </span>
                                                )}
                                           </div>
                                           {!isSelectMode && <Maximize2 size={16} className="text-white-50" />}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div className="flex-grow-10" style={{ flexBasis: '200px', flexGrow: 100 }}></div>
                    </div>
                </div>
            ))}
            <style>{`
                .photo-item-container {
                    height: 240px;
                    flex-basis: 180px;
                    max-width: 450px;
                }
                .photo-item-container:hover .photo-overlay {
                    opacity: 1 !important;
                }
                .photo-item-container:hover img {
                    transform: scale(1.1);
                }
                .photo-item-container.selected img {
                    transform: scale(0.95);
                }
                .photo-item-container:active {
                    transform: scale(0.98);
                }
                .tiny-text {
                    font-size: 10px;
                }
                .glass-panel-subtle {
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    z-index: 100;
                    margin: 0 -1rem;
                    padding: 0.5rem 1rem;
                    border-radius: 12px;
                }
                .transition-transform {
                    transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
                }
                .transition-opacity {
                    transition: opacity 0.3s ease;
                }
                .flex-grow-10 {
                    flex-grow: 10 !important;
                }
                .scale-90 { transform: scale(0.95); }
                
                @media (max-width: 768px) {
                    .photo-item-container {
                        height: 120px !important;
                        flex-basis: 100px !important;
                    }
                    .photo-overlay {
                        display: none !important;
                    }
                    .pe-5, .container-grid {
                         padding-right: 0 !important;
                    }
                }
            `}</style>
        </div>
    );
};


export default PhotoGrid;
