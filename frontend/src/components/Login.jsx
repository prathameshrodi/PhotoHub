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
        <Container fluid className="p-0 m-0 d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <Card className="glass-card shadow-lg border-0" style={{ width: '100%', maxWidth: '420px', borderRadius: '16px' }}>
                <Card.Body className="p-5">
                    <div className="text-center mb-4 mt-2">
                        <div style={{ width: '56px', height: '56px', background: 'var(--accent-primary)', borderRadius: '16px', margin: '0 auto 16px' }} className="shadow"></div>
                        <h2 className="fw-bold fs-3 text-white tracking-tight">Welcome back</h2>
                        <p className="text-white-50">Sign in to your secure gallery</p>
                    </div>

                    {error && <Alert variant="danger" className="border-0 rounded-3">{error}</Alert>}

                    <Form onSubmit={handleLogin}>
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

                        <Form.Group className="mb-4">
                            <Form.Label className="text-white-50 fw-medium small">Password</Form.Label>
                            <Form.Control 
                                type="password" 
                                value={password} 
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                required 
                                className="py-2"
                            />
                        </Form.Group>

                        <Button variant="primary" type="submit" className="w-100 mb-3 py-2 fw-semibold shadow-sm rounded-3 mt-2" disabled={loading} style={{ background: 'var(--accent-primary)', border: 'none' }}>
                            {loading ? <Spinner as="span" animation="border" size="sm" /> : 'Sign In'}
                        </Button>
                    </Form>
                    
                    <div className="text-center mt-3 mb-2">
                        <span className="text-white-50">Don't have an account? </span>
                        <Link to="/signup" className="text-decoration-none fw-medium" style={{ color: 'var(--accent-primary)' }}>Create account</Link>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default Login;
