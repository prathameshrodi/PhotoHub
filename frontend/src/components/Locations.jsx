import React, { useEffect, useState } from 'react';
import api from '../api';
import { Card, Container, Row, Col, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Locations = () => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/locations')
           .then(res => setLocations(res.data))
           .catch(err => console.error("Failed to fetch locations", err))
           .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
             <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    return (
        <Container fluid>
            <h2 className="fw-bold mb-4">Locations</h2>
            {locations.length === 0 ? (
                 <div className="text-center text-muted">No location data found yet.</div>
            ) : (
                <Row xs={1} md={2} lg={3} xl={4} className="g-4">
                    {locations.map((loc, idx) => (
                        <Col key={idx}>
                             <Link to={`/locations/${encodeURIComponent(loc.name)}`} className="text-decoration-none text-dark">
                                <Card className="h-100 shadow-sm border-0 location-card">
                                    <div className="ratio ratio-16x9 overflow-hidden">
                                        <Card.Img 
                                            variant="top" 
                                            src={
                                                loc.cover_photo?.startsWith('data:') 
                                                    ? loc.cover_photo 
                                                    : (loc.cover_photo ? `http://localhost:8000${loc.cover_photo}` : '')
                                            } 
                                            alt={loc.name}
                                            className="object-fit-cover"
                                        />
                                        <div className="position-absolute bottom-0 start-0 w-100 p-2" 
                                             style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
                                            <h5 className="text-white mb-0">{loc.name}</h5>
                                            <small className="text-white-50">{loc.count} photos</small>
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        </Col>
                    ))}
                </Row>
            )}
            <style>{`
                .location-card { transition: transform 0.2s; }
                .location-card:hover { transform: scale(1.02); }
            `}</style>
        </Container>
    );
};

export default Locations;
