import React from 'react';
import { Form, Badge } from 'react-bootstrap';

const GalleryToolbar = ({ title, sortOrder, setSortOrder, count }) => {
    return (
        <div className="d-flex justify-content-between align-items-center mb-4 mt-2">
            <h2 className="fw-bold mb-0 text-white tracking-tight">
                {title}
            </h2>
            <div className="d-flex align-items-center gap-3">
                <Form.Select 
                    value={sortOrder} 
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="shadow-sm"
                    style={{ width: 'auto', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)' }}
                >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                </Form.Select>
                <Badge bg="primary" className="px-3 py-2 rounded-pill shadow-sm" style={{ fontWeight: 500 }}>{count} items</Badge>
            </div>
        </div>
    );
};

export default GalleryToolbar;
