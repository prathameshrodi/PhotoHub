import React, { useState, useEffect } from 'react';

const TimelineSidebar = ({ timeline, possibleKeys, onJump }) => {
    const items = timeline.length > 0 ? timeline : possibleKeys;
    const [hoveredKey, setHoveredKey] = useState(null);
    const [activeKey, setActiveKey] = useState(null);

    // Group items by Year for better visualization
    const groupedByYear = items.reduce((acc, item) => {
        const year = item.split(' ')[1];
        if (!acc[year]) acc[year] = [];
        acc[year].push(item);
        return acc;
    }, {});

    const years = Object.keys(groupedByYear).sort((a, b) => b - a);

    return (
        <div className="position-fixed end-0 top-50 translate-middle-y me-3 d-none d-lg-flex flex-column align-items-end" style={{ zIndex: 1000, width: '120px' }}>
            <div className="glass-panel p-2 rounded-4 shadow-lg border border-white-10 d-flex flex-column gap-3 py-4" style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                {years.map(year => (
                    <div key={year} className="d-flex flex-column align-items-end gap-1">
                        <span className="text-white fw-bold mb-1 pe-2" style={{ fontSize: '0.75rem', opacity: 0.8 }}>{year}</span>
                        <div className="d-flex flex-column align-items-end gap-2">
                            {groupedByYear[year].map(monthKey => {
                                const isCurrent = activeKey === monthKey;
                                const isHovered = hoveredKey === monthKey;
                                return (
                                    <div 
                                        key={monthKey}
                                        className="position-relative d-flex align-items-center justify-content-end"
                                        onMouseEnter={() => setHoveredKey(monthKey)}
                                        onMouseLeave={() => setHoveredKey(null)}
                                        onClick={() => {
                                            setActiveKey(monthKey);
                                            onJump(monthKey);
                                        }}
                                        style={{ cursor: 'pointer', height: '12px' }}
                                    >
                                        {(isHovered || isCurrent) && (
                                            <span className="position-absolute end-100 me-2 text-nowrap badge rounded-pill bg-primary fade-in shadow-sm" style={{ fontSize: '10px' }}>
                                                {monthKey.split(' ')[0]}
                                            </span>
                                        )}
                                        <div 
                                            className={`timeline-dot transition-all ${isCurrent ? 'active' : ''}`}
                                            style={{ 
                                                width: isHovered || isCurrent ? '24px' : '8px',
                                                height: '4px',
                                                borderRadius: '2px',
                                                background: isCurrent ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)',
                                                boxShadow: isCurrent ? '0 0 8px var(--accent-primary)' : 'none'
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            <style>{`
                .timeline-dot:hover {
                    background: rgba(255,255,255,0.6) !important;
                }
                .timeline-dot.active {
                    background: var(--accent-primary) !important;
                }
                .transition-all {
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .border-white-10 {
                    border-color: rgba(255,255,255,0.1) !important;
                }
            `}</style>
        </div>
    );
};

export default TimelineSidebar;
