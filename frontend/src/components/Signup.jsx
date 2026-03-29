import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import api from '../api';

const Signup = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirm) {
            setError("Passwords do not match");
            return;
        }
        
        setLoading(true);
        try {
            await api.post('/signup', {
                 username,
                 password
            });
            alert("Account created! Please login.");
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.detail || 'Signup failed');
            setLoading(false);
        }
    };

    return (
        <Container fluid className="p-0 m-0 d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <Card className="glass-card shadow-lg border-0" style={{ width: '100%', maxWidth: '420px', borderRadius: '16px' }}>
                <Card.Body className="p-5">
                    <div className="text-center mb-4 mt-2">
                        <div style={{ width: '56px', height: '56px', background: 'var(--accent-primary)', borderRadius: '16px', margin: '0 auto 16px' }} className="shadow"></div>
                        <h2 className="fw-bold fs-3 text-white tracking-tight">Create Account</h2>
                        <p className="text-white-50">Join your personal photo library</p>
                    </div>

                    {error && <Alert variant="danger" className="border-0 rounded-3">{error}</Alert>}

                    <Form onSubmit={handleSignup}>
                        <Form.Group className="mb-3">
                            <Form.Label className="text-white-50 fw-medium small">Username</Form.Label>
                            <Form.Control 
                                type="text" 
                                value={username} 
                                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                                autoFocus
                                required 
                                className="py-2"
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="text-white-50 fw-medium small">Password</Form.Label>
                            <Form.Control 
                                type="password" 
                                value={password} 
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                required 
                                className="py-2"
                            />
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label className="text-white-50 fw-medium small">Confirm Password</Form.Label>
                            <Form.Control 
                                type="password" 
                                value={confirm} 
                                onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                                required 
                                className="py-2"
                            />
                        </Form.Group>

                        <Button variant="primary" type="submit" className="w-100 mb-3 py-2 fw-semibold shadow-sm rounded-3 mt-2" disabled={loading} style={{ background: 'var(--accent-primary)', border: 'none' }}>
                            {loading ? <Spinner as="span" animation="border" size="sm" /> : 'Create Account'}
                        </Button>
                    </Form>
                    
                    <div className="text-center mt-3 mb-2">
                        <span className="text-white-50">Already have an account? </span>
                        <Link to="/login" className="text-decoration-none fw-medium" style={{ color: 'var(--accent-primary)' }}>Login</Link>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default Signup;
