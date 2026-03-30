import React from 'react';
import { NavLink } from 'react-router-dom';
import { Image, Users, LogOut, MapPin, Search, Bell, Settings, Album as AlbumIcon } from 'lucide-react';
import { Nav, Button, Container } from 'react-bootstrap';
import api from '../api';

const Navbar = () => {
    const navItems = [
        { icon: Image, label: 'Library', path: '/' },
        { icon: Users, label: 'People', path: '/people' },
        { icon: MapPin, label: 'Places', path: '/locations' },
        { icon: AlbumIcon, label: 'Albums', path: '/albums' },
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
        <nav className="glass-panel sticky-top py-2 px-4 d-flex align-items-center justify-content-between" style={{ zIndex: 1100, height: '70px' }}>
            <div className="d-flex align-items-center gap-4">
                <a href="/" className="d-flex align-items-center text-white text-decoration-none me-4">
                    <img src="/favicon.svg" alt="PhotoHub Logo" style={{ width: '40px', height: '40px' }} className="me-2" />
                    <span className="fs-4 fw-bold tracking-tight" style={{ letterSpacing: '-0.8px', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PhotoHub</span>
                </a>


                <Nav className="d-flex align-items-center gap-2">
                    {navItems.map((item) => (
                        <Nav.Item key={item.path}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) => `nav-link px-3 py-2 rounded-pill d-flex align-items-center gap-2 ${isActive ? 'bg-primary text-white shadow-sm' : 'text-white-50 hover-glow'}`}
                                style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', fontWeight: 500, fontSize: '0.95rem' }}
                            >
                                <item.icon size={18} />
                                {item.label}
                            </NavLink>
                        </Nav.Item>
                    ))}
                </Nav>
            </div>

            <div className="flex-grow-1 mx-5 d-none d-md-block" style={{ maxWidth: '500px' }}>
                <div className="position-relative">
                    <Search className="position-absolute top-50 translate-middle-y ms-3 text-white-50" size={18} />
                    <input
                        type="text"
                        placeholder="Search your memories..."
                        className="form-control border-0 bg-secondary-subtle ps-5 py-2 rounded-pill shadow-inner"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}
                    />
                </div>
            </div>

            <div className="d-flex align-items-center gap-3">
                <Button variant="link" className="text-white-50 p-2 hover-glow rounded-circle">
                    <Bell size={20} />
                </Button>
                <Button variant="link" className="text-white-50 p-2 hover-glow rounded-circle">
                    <Settings size={20} />
                </Button>
                <div className="vr mx-2 bg-secondary" style={{ height: '24px' }}></div>
                <Button 
                    variant="link" 
                    onClick={handleLogout}
                    className="text-danger-emphasis p-2 hover-glow rounded-circle d-flex align-items-center justify-content-center"
                    title="Sign Out"
                >
                    <LogOut size={20} />
                </Button>
                <div className="ms-2 shadow-sm" style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--accent-primary)', border: '2px solid rgba(255,255,255,0.1)' }}></div>
            </div>

            <style>{`
                .hover-glow:hover { 
                    color: white !important; 
                    background: rgba(255, 255, 255, 0.08); 
                    transform: translateY(-1px);
                }
                .nav-link.active {
                    transform: scale(1.05);
                }
                .shadow-inner {
                    box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
                }
            `}</style>
        </nav>
    );
};

export default Navbar;
