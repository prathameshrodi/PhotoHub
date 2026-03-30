import React from 'react';
import { NavLink } from 'react-router-dom';
import { Image, Users, MapPin, Album as AlbumIcon } from 'lucide-react';

const BottomNav = () => {
    const navItems = [
        { icon: Image, label: 'Library', path: '/' },
        { icon: Users, label: 'People', path: '/people' },
        { icon: MapPin, label: 'Places', path: '/locations' },
        { icon: AlbumIcon, label: 'Albums', path: '/albums' },
    ];

    return (
        <nav className="bottom-nav d-md-none fixed-bottom glass-panel d-flex justify-content-around align-items-center" style={{ height: '70px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {navItems.map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `d-flex flex-column align-items-center text-decoration-none transition-all ${isActive ? 'text-primary' : 'text-white-50'}`}
                    style={{ flex: 1 }}
                >
                    <item.icon size={22} className="mb-1" />
                    <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{item.label}</span>
                </NavLink>
            ))}
            <style>{`
                .bottom-nav {
                    background: rgba(15, 23, 42, 0.85);
                    backdrop-filter: blur(20px) saturate(180%);
                    z-index: 1000;
                }
            `}</style>
        </nav>
    );
};

export default BottomNav;
