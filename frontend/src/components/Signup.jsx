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
            await api.post('/auth/signup', { // Changed to new router prefix if applicable? 
                // Wait, main.py uses: app.include_router(auth.router, tags=["auth"]) NO PREFIX.
                // So it is still /signup
                // But wait, the route was defined as @router.post("/signup").
                // If router has no prefix in include_router, it's /signup.
                // The previous code had axios.post('http://localhost:8000/signup')
                // Let's use api.post('/signup')
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
        <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: '#f8f9fa' }}>
            <Card className="shadow-sm" style={{ width: '100%', maxWidth: '400px' }}>
                <Card.Body className="p-4">
                    <div className="text-center mb-4">
                        <h2 className="fw-bold fs-4">Create Account</h2>
                        <p className="text-muted">Join Photos today</p>
                    </div>

                    {error && <Alert variant="danger">{error}</Alert>}

                    <Form onSubmit={handleSignup}>
                        <Form.Group className="mb-3">
                            <Form.Label>Username</Form.Label>
                            <Form.Control 
                                type="text" 
                                value={username} 
                                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                                autoFocus
                                required 
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Password</Form.Label>
                            <Form.Control 
                                type="password" 
                                value={password} 
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                required 
                            />
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label>Confirm Password</Form.Label>
                            <Form.Control 
                                type="password" 
                                value={confirm} 
                                onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                                required 
                            />
                        </Form.Group>

                        <Button variant="success" type="submit" className="w-100 mb-3" disabled={loading}>
                            {loading ? <Spinner as="span" animation="border" size="sm" /> : 'Create Account'}
                        </Button>
                    </Form>
                    
                    <div className="text-center">
                        <span className="text-muted">Already have an account? </span>
                        <Link to="/login" className="text-decoration-none">Login</Link>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default Signup;
