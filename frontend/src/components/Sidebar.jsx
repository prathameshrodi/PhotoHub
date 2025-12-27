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
        <div className="d-flex flex-column flex-shrink-0 p-3 bg-light" style={{ width: '280px', height: '100vh', borderRight: '1px solid #dee2e6' }}>
            <a href="/" className="d-flex align-items-center mb-3 mb-md-0 me-md-auto link-dark text-decoration-none">
                <div style={{ width: '32px', height: '32px', background: '#0d6efd', borderRadius: '8px' }} className="me-2"></div>
                <span className="fs-4 fw-bold">Photos</span>
            </a>
            <hr />
            <Nav className="flex-column mb-auto">
                {navItems.map((item) => (
                    <Nav.Item key={item.path}>
                        <NavLink
                            to={item.path}
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : 'link-dark'} d-flex align-items-center gap-2`}
                        >
                            <item.icon size={18} />
                            {item.label}
                        </NavLink>
                    </Nav.Item>
                ))}
            </Nav>
            <hr />
            <div className="d-grid gap-2">
                <Button 
                    variant="outline-danger" 
                    onClick={handleLogout}
                    className="d-flex align-items-center justify-content-center gap-2"
                >
                    <LogOut size={18} />
                    Sign Out
                </Button>
            </div>
            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default Sidebar;
