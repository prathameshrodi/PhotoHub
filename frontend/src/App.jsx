import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Gallery from './components/Gallery';
import People from './components/People';
import Login from './components/Login';
import Signup from './components/Signup';
import Locations from './components/Locations';
import logger from './logger';

const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" />;
};

const Layout = () => {
    // Shared Layout for authenticated pages
    // We use height: 100vh and overflow-hidden on the outer container.
    // The Sidebar stays static (fit-content or fixed width).
    // The Main area grows and handles its own scrolling (overflow-y-auto).
    return (
      <div className="d-flex" style={{ height: '100vh', overflow: 'hidden', backgroundColor: '#f8f9fa' }}>
        <Sidebar />
        <main className="flex-grow-1 d-flex flex-column" style={{ minWidth: 0, height: '100vh', overflowY: 'auto' }}>
          <header className="d-flex justify-content-between align-items-center mb-4 pb-3 pt-4 px-4 sticky-top glass-panel" style={{ zIndex: 100 }}>
            <div className="flex-grow-1">
                 {/* Optional: Breadcrumbs or Title */}
            </div>
            <input
              type="text"
              placeholder="Search photos..."
              className="form-control"
              style={{ maxWidth: '400px' }}
            />
            <div className="ms-3" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-primary)' }}></div>
          </header>
          
          <div className="px-4 pb-4 flex-grow-1">
            <Routes>
               <Route path="/" element={<Gallery />} />
               <Route path="/people" element={<People />} />
               <Route path="/people/:id" element={<Gallery />} />
               <Route path="/locations" element={<Locations />} />
               {/* Note: We need to handle location filtering in Gallery if we route /locations/:id to it.
                   Currently Gallery takes :id for Person ID.
                   We might need a different prop or route param for location.
                   Let's assume we pass a location prop or parse query param? 
                   Actually, Gallery uses useParams().id. If we reuse it, it thinks it is Person ID.
                   Let's route to /locations/:locationName and make Gallery handle it, 
                   or create a LocationGallery wrapper.
                   Simplest: <Route path="/locations/:locationName" element={<Gallery view="location" />} />
                */}
               <Route path="/locations/:locationName" element={<Gallery view="location" />} />
            </Routes>
          </div>
        </main>
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
