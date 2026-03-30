import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import MobileNav from './components/MobileNav';
import Gallery from './components/Gallery';
import People from './components/People';
import Albums from './components/Albums';
import Login from './components/Login';
import Signup from './components/Signup';
import Locations from './components/Locations';
import logger from './logger';

const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" />;
};

const Layout = () => {
    return (
      <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: 'var(--bg-primary)', height: '100dvh', overflow: 'hidden' }}>
        <div className="d-none d-md-block">
            <Navbar />
        </div>
        <div className="d-md-none glass-panel p-3 d-flex align-items-center justify-content-between sticky-top" style={{ zIndex: 1100 }}>
             <div className="d-flex align-items-center gap-2">
                 <img src="/favicon.svg" alt="PhotoHub" style={{ width: '32px', height: '32px' }} />
                 <h4 className="m-0 fw-bold text-white tracking-tight">PhotoHub</h4>
             </div>
             <div className="shadow-sm" style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-primary)', border: '2px solid rgba(255,255,255,0.1)' }}></div>
        </div>

        
        <main className="flex-grow-1 overflow-auto position-relative custom-scrollbar" style={{ minWidth: 0, paddingBottom: '80px' }}>
          <div className="container-fluid py-4 px-3 px-lg-5">
            <Routes>
               <Route path="/" element={<Gallery />} />
               <Route path="/people" element={<People />} />
               <Route path="/people/:id" element={<Gallery />} />
               <Route path="/locations" element={<Locations />} />
               <Route path="/locations/:locationName" element={<Gallery view="location" />} />
               <Route path="/albums" element={<Albums />} />
               <Route path="/albums/:id" element={<Gallery view="album" />} />
            </Routes>
          </div>
        </main>
        
        <MobileNav />
      </div>
    );
};

function App() {
  useEffect(() => {
    logger.info("Application started");
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/*" element={
            <PrivateRoute>
                <Layout />
            </PrivateRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
