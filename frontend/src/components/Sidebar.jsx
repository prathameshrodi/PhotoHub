import React from 'react';
import { NavLink } from 'react-router-dom';
import { Image, Users, LogOut, MapPin } from 'lucide-react';
import { Nav, Button } from 'react-bootstrap';
import api from '../api';

const Sidebar = () => {
    
    const navItems = [
        { icon: Image, label: 'All Photos', path: '/' },
        { icon: Users, label: 'People', path: '/people' },
        { icon: MapPin, label: 'Locations', path: '/locations' }, // New Locations Tab
    ];

    const handleLogout = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                await api.post('/logout');
            } catch (e) {
                console.error("Logout failed locally", e);
            }
        }
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    return (
        <div className="d-flex flex-column flex-shrink-0 p-3 glass-sidebar text-white" style={{ width: '280px', height: '100vh' }}>
            <a href="/" className="d-flex align-items-center mb-4 mt-2 me-md-auto text-white text-decoration-none px-2">
                <div style={{ width: '36px', height: '36px', background: 'var(--accent-primary)', borderRadius: '10px' }} className="me-3 d-flex justify-content-center align-items-center shadow">
                    <Image size={20} color="white" />
                </div>
                <span className="fs-4 fw-bold tracking-tight" style={{ letterSpacing: '-0.5px' }}>Photos</span>
            </a>
            
            <Nav className="flex-column mb-auto mt-2">
                {navItems.map((item) => (
                    <Nav.Item key={item.path} className="mb-1">
                        <NavLink
                            to={item.path}
                            className={({ isActive }) => `nav-link rounded-3 px-3 py-2 d-flex align-items-center gap-3 ${isActive ? 'bg-primary text-white shadow-sm' : 'text-white-50 hover-bg-glass'}`}
                            style={{ transition: 'all 0.2s ease', fontWeight: 500 }}
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon size={20} className={isActive ? "text-white" : "text-white-50"} />
                                    {item.label}
                                </>
                            )}
                        </NavLink>
                    </Nav.Item>
                ))}
            </Nav>
            
            <div className="mt-auto pt-3 border-top border-secondary">
                <Button 
                    variant="link" 
                    onClick={handleLogout}
                    className="nav-link text-danger w-100 d-flex align-items-center gap-3 px-3 py-2 rounded-3 hover-bg-danger-subtle text-start"
                    style={{ textDecoration: 'none', transition: 'all 0.2s ease', fontWeight: 500 }}
                >
                    <LogOut size={20} />
                    Sign Out
                </Button>
            </div>
            <style>{`
                .hover-bg-glass:hover { background: rgba(255, 255, 255, 0.05); color: white !important; }
                .hover-bg-danger-subtle:hover { background: rgba(220, 53, 69, 0.1); }
            `}</style>
        </div>
    );
};

export default Sidebar;
