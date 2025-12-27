import React, { useEffect, useCallback } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react';

const ImageViewer = ({ show, onClose, images, currentIndex, onNavigate, scale, rotation, setScale, setRotation }) => {
    
    // Removed local state and effects for scale/rotation
    // They are now controlled by parent via props

    const handleNext = useCallback((e) => {
        e?.stopPropagation();
        if (currentIndex < images.length - 1) {
            onNavigate(currentIndex + 1);
            // State is reset by parent in onNavigate
        }
    }, [currentIndex, images.length, onNavigate]);

    const handlePrev = useCallback((e) => {
        e?.stopPropagation();
        if (currentIndex > 0) {
            onNavigate(currentIndex - 1);
            // State is reset by parent in onNavigate
        }
    }, [currentIndex, onNavigate]);

    const handleKeyDown = useCallback((e) => {
        if (!show) return;
        if (e.key === 'ArrowRight') handleNext();
        if (e.key === 'ArrowLeft') handlePrev();
        if (e.key === 'Escape') onClose();
    }, [show, handleNext, handlePrev, onClose]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const handleZoomIn = (e) => {
        e.stopPropagation();
        setScale(prev => Math.min(prev + 0.5, 4));
    };

    const handleZoomOut = (e) => {
        e.stopPropagation();
        setScale(prev => Math.max(prev - 0.5, 1));
    };

    const handleRotate = (e) => {
        e.stopPropagation();
        setRotation(prev => (prev + 90) % 360);
    };

    const handleDownload = async (e) => {
        e.stopPropagation();
        const currentImage = images[currentIndex];
        if (!currentImage) return;

        try {
            const imageUrl = `http://localhost:8000/images/content/${currentImage.id}`;
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = currentImage.filename || `image-${currentImage.id}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed", error);
        }
    };

    if (!show || images.length === 0 || !images[currentIndex]) return null;

    const currentImage = images[currentIndex];
    const imageUrl = `http://localhost:8000/images/content/${currentImage.id}`;

    return (
        <Modal 
            show={show} 
            onHide={onClose} 
            fullscreen 
            centered 
            contentClassName="bg-dark text-white border-0"
            style={{ zIndex: 2000 }}
        >
            <Modal.Body className="p-0 d-flex flex-column h-100 position-relative overflow-hidden">
                {/* Toolbar */}
                <div className="d-flex justify-content-between align-items-center p-3 position-absolute top-0 start-0 end-0" style={{ zIndex: 1050, background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}>
                    <div className="d-flex gap-3">
                        <Button variant="link" className="text-white p-0" onClick={handleZoomIn} title="Zoom In">
                            <ZoomIn />
                        </Button>
                        <Button variant="link" className="text-white p-0" onClick={handleZoomOut} title="Zoom Out">
                            <ZoomOut />
                        </Button>
                        <Button variant="link" className="text-white p-0" onClick={handleRotate} title="Rotate">
                            <RotateCw />
                        </Button>
                    </div>
                    
                    <div className="d-flex gap-3">
                        <Button variant="link" className="text-white p-0" onClick={handleDownload} title="Download">
                            <Download />
                        </Button>
                        <Button variant="link" className="text-white p-0" onClick={onClose} title="Close">
                            <X size={32} />
                        </Button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-grow-1 d-flex align-items-center justify-content-center position-relative w-100 h-100">
                    {/* Navigation Buttons */}
                    {currentIndex > 0 && (
                        <Button 
                            variant="link" 
                            className="position-absolute start-0 top-50 translate-middle-y text-white p-3" 
                            style={{ zIndex: 1040 }}
                            onClick={handlePrev}
                        >
                            <ChevronLeft size={48} />
                        </Button>
                    )}
                    
                    {currentIndex < images.length - 1 && (
                        <Button 
                            variant="link" 
                            className="position-absolute end-0 top-50 translate-middle-y text-white p-3" 
                            style={{ zIndex: 1040 }}
                            onClick={handleNext}
                        >
                            <ChevronRight size={48} />
                        </Button>
                    )}

                    {/* Image Area */}
                    <div 
                        className="d-flex justify-content-center align-items-center"
                        style={{ 
                            width: '100%', 
                            height: '100%', 
                            overflow: 'hidden' 
                        }}
                    >
                        <img 
                            src={imageUrl} 
                            alt={currentImage.filename}
                            style={{ 
                                transform: `scale(${scale}) rotate(${rotation}deg)`,
                                transition: 'transform 0.3s ease',
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                            }}
                            draggable={false}
                        />
                    </div>
                </div>
                
                {/* Footer Info */}
                <div className="position-absolute bottom-0 start-0 end-0 p-3 text-center" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)', zIndex: 1050 }}>
                     <small>{currentImage.filename} • {new Date(currentImage.capture_date || currentImage.timestamp).toLocaleString()}</small>
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default ImageViewer;
