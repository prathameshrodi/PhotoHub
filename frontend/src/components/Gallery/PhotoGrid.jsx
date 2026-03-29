import React, { useMemo } from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { MapPin } from 'lucide-react';

const PhotoGrid = ({ images, sortOrder, onImageClick }) => {
    // Group logic here or passed in? 
    // Gallery.jsx had the grouping logic. It's better to keep business logic in hooks or container. 
    // But for rendering, we can accept "groups" as props or calculate here.
    // Let's calculate here for simplicity if 'images' is flat list.
    
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

    return (
        <>
            {Object.entries(groupedImages).map(([groupKey, groupPhotos]) => (
                <div key={groupKey} id={groupKey} className="mb-5">
                    <h4 className="text-white-50 mb-3 border-bottom border-secondary pb-2 sticky-top glass-panel px-3 rounded" style={{ top: '0px', zIndex: 10 }}>
                        {groupKey}
                    </h4>
                    <Row xs={2} md={4} lg={5} xl={6} className="g-3">
                        {groupPhotos.map((img) => (
                            <Col key={img.id}>
                                <Card 
                                    className="h-100 border-0 glass-card photo-card bg-transparent p-1"
                                    onClick={() => onImageClick(img)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="ratio ratio-1x1 overflow-hidden rounded-3 shadow-sm">
                                        <Card.Img 
                                            variant="top" 
                                            src={`http://localhost:8000/images/thumbnail/${img.id}`} 
                                            alt={img.filename}
                                            className="object-fit-cover"
                                            loading="lazy"
                                            style={{ transition: 'transform 0.3s' }}
                                        />
                                    </div>
                                    <div className="mt-2 mb-1 small text-white-50 d-flex justify-content-between align-items-center px-1">
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
            ))}
            <style>{`
                .photo-card:hover img {
                    transform: scale(1.05);
                }
            `}</style>
        </>
    );
};

export default PhotoGrid;
