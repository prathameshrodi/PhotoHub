import React from 'react';
import { Form, Badge, Button } from 'react-bootstrap';
import { CheckSquare, X } from 'lucide-react';

const GalleryToolbar = ({ title, sortOrder, setSortOrder, count, isSelectMode, onToggleSelectMode }) => {
    return (
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 mt-2 gap-3">
            <h2 className="fw-bold mb-0 text-white tracking-tight d-flex align-items-center gap-3">
                {title}
                <Badge bg="primary" className="px-3 py-1 rounded-pill shadow-sm fs-6" style={{ fontWeight: 500, backgroundColor: 'rgba(59, 130, 246, 0.2) !important', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>{count}</Badge>
            </h2>
            <div className="d-flex align-items-center gap-2">
                <Form.Select 
                    value={sortOrder} 
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="shadow-sm rounded-pill border-0 px-4 py-2"
                    style={{ width: 'auto', backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.9rem' }}
                >
                    <option value="desc" className="bg-dark text-white">Newest First</option>
                    <option value="asc" className="bg-dark text-white">Oldest First</option>
                </Form.Select>
                
                <Button 
                    variant={isSelectMode ? "danger" : "outline-primary"}
                    className="rounded-pill px-4 py-2 d-flex align-items-center gap-2 border-0"
                    style={{ backgroundColor: isSelectMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: isSelectMode ? '#ef4444' : '#3b82f6' }}
                    onClick={onToggleSelectMode}
                >
                    {isSelectMode ? <X size={18} /> : <CheckSquare size={18} />}
                    <span className="fw-medium">{isSelectMode ? "Cancel" : "Select"}</span>
                </Button>
            </div>
        </div>
    );
};

export default GalleryToolbar;
