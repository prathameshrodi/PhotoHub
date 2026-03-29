import React from 'react';
import { Col } from 'react-bootstrap';

const TimelineSidebar = ({ timeline, possibleKeys, onJump }) => {
    const items = timeline.length > 0 ? timeline : possibleKeys;

    return (
        <Col md={2} className="d-none d-md-block">
            <div className="sticky-top" style={{ top: '100px', maxHeight: '80vh', overflowY: 'auto' }}>
                <div className="d-flex flex-column gap-1 border-start border-secondary ps-3">
                    {items.map(key => (
                        <small 
                            key={key} 
                            className="text-white-50 cursor-pointer timeline-link" 
                            style={{ cursor: 'pointer', transition: 'color 0.2s', fontWeight: 500 }}
                            onClick={() => onJump(key)}
                        >
                            {key}
                        </small>
                    ))}
                    <style>{`
                        .timeline-link:hover { color: white !important; }
                    `}</style>
                </div>
            </div>
        </Col>
    );
};

export default TimelineSidebar;
