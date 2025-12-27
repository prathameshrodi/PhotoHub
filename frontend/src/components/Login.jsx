import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);

            const response = await api.post('/token', formData);
            localStorage.setItem('token', response.data.access_token);
            navigate('/');
        } catch (err) {
            console.error("Login Error", err);
            setError('Invalid username or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: '#f8f9fa' }}>
            <Card className="shadow-sm" style={{ width: '100%', maxWidth: '400px' }}>
                <Card.Body className="p-4">
                    <div className="text-center mb-4">
                        <div style={{ width: '48px', height: '48px', background: '#0d6efd', borderRadius: '12px', margin: '0 auto 16px' }}></div>
                        <h2 className="fw-bold fs-4">Welcome back</h2>
                        <p className="text-muted">Sign in to your account</p>
                    </div>

                    {error && <Alert variant="danger">{error}</Alert>}

                    <Form onSubmit={handleLogin}>
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

                        <Form.Group className="mb-4">
                            <Form.Label>Password</Form.Label>
                            <Form.Control 
                                type="password" 
                                value={password} 
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                required 
                            />
                        </Form.Group>

                        <Button variant="primary" type="submit" className="w-100 mb-3" disabled={loading}>
                            {loading ? <Spinner as="span" animation="border" size="sm" /> : 'Sign In'}
                        </Button>
                    </Form>
                    
                    <div className="text-center">
                        <span className="text-muted">Don't have an account? </span>
                        <Link to="/signup" className="text-decoration-none">Create account</Link>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default Login;
