import React, { useEffect, useState } from 'react';
import { Row, Col, Spinner, Button, Modal, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Album as AlbumIcon, Plus, Trash2, ExternalLink } from 'lucide-react';
import api, { API_BASE_URL } from '../api';

const Albums = () => {

    const [albums, setAlbums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newAlbumName, setNewAlbumName] = useState("");
    const [newAlbumDesc, setNewAlbumDesc] = useState("");

    const fetchAlbums = () => {
        setLoading(true);
        api.get('/albums')
           .then(res => setAlbums(res.data))
           .catch(err => console.error("Failed to load albums", err))
           .finally(() => setLoading(false));
    };

    useEffect(() => {
        // Initial fetch directly to avoid cascading render lint
        api.get('/albums')
           .then(res => setAlbums(res.data))
           .catch(err => console.error("Failed to load albums", err))
           .finally(() => setLoading(false));
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/albums', { name: newAlbumName, description: newAlbumDesc });
            setShowCreateModal(false);
            setNewAlbumName("");
            setNewAlbumDesc("");
            fetchAlbums();
        } catch (error) {
            console.error("Create album failed", error);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!window.confirm("Delete this album? This will not delete the photos.")) return;
        try {
            await api.delete(`/albums/${id}`);
            fetchAlbums();
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    return (
        <div className="fade-in px-2">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
                <div>
                    <h2 className="fw-bold text-white mb-1 d-flex align-items-center gap-3">
                        <div className="p-2 rounded-3 bg-primary bg-opacity-10 text-primary">
                            <AlbumIcon size={28} />
                        </div>
                        Albums
                    </h2>
                    <p className="text-white-50 mb-0 ms-1 ps-5 ps-md-0">Your curated collections and memories</p>
                </div>
                <Button 
                    variant="primary" 
                    className="rounded-pill px-4 py-2 d-flex align-items-center justify-content-center gap-2 shadow-lg"
                    onClick={() => setShowCreateModal(true)}
                >
                    <Plus size={20} />
                    <span className="fw-semibold">New Album</span>
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                </div>
            ) : (
                <Row xs={1} sm={2} md={3} lg={4} xl={5} xxl={6} className="g-4">
                    {albums.length === 0 ? (
                        <Col xs={12}>
                             <div className="text-center py-5 glass-panel rounded-4">
                                <div className="mb-4 opacity-25">
                                    <AlbumIcon size={64} />
                                </div>
                                <h4 className="text-white fw-bold">No albums yet</h4>
                                <p className="text-white-50">Create your first collection to keep memories organized.</p>
                                <Button variant="outline-primary" className="rounded-pill mt-2" onClick={() => setShowCreateModal(true)}>
                                    Create Collection
                                </Button>
                             </div>
                        </Col>
                    ) : albums.map(album => {
                        const coverSrc = album.cover_image_id 
                            ? `${API_BASE_URL}/images/thumbnail/${album.cover_image_id}` 
                            : 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=500&auto=format&fit=crop';
                        
                        return (
                            <Col key={album.id}>
                                <Link to={`/albums/${album.id}`} className="text-decoration-none">
                                    <div className="album-card-v2 glass-card overflow-hidden h-100 position-relative group">
                                        <div className="ratio ratio-1x1 overflow-hidden">
                                            <img 
                                                src={coverSrc} 
                                                alt={album.name} 
                                                className="w-100 h-100 object-fit-cover transition-all"
                                            />
                                            <div className="album-hover-overlay position-absolute inset-0 d-flex align-items-center justify-content-center opacity-0 transition-all bg-black bg-opacity-40" style={{ backdropFilter: 'blur(2px)' }}>
                                                <ExternalLink size={24} className="text-white scale-up" />
                                            </div>
                                            <div className="position-absolute top-0 end-0 p-3 z-index-10">
                                                <button 
                                                    className="btn btn-dark btn-sm bg-opacity-50 border-0 rounded-circle p-2 delete-btn transition-transform hover-scale"
                                                    onClick={(e) => handleDelete(album.id, e)}
                                                >
                                                    <Trash2 size={14} className="text-danger" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-3 border-top border-white border-opacity-10 bg-black bg-opacity-20">
                                            <h3 className="fs-6 fw-bold text-white m-0 text-truncate mb-1">{album.name}</h3>
                                            <div className="d-flex justify-content-between align-items-center">
                                                <span className="text-white-50 tiny-text uppercase tracking-widest fw-medium">
                                                    {album.image_count} {album.image_count === 1 ? 'item' : 'items'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </Col>
                        );
                    })}
                </Row>
            )}

            <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered className="glass-modal">
                <div className="glass-panel p-4 border border-white border-opacity-10 rounded-4">
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="text-white fw-bold">Create New Album</Modal.Title>
                    </Modal.Header>
                    <Form onSubmit={handleCreate}>
                        <Modal.Body className="pt-4">
                            <Form.Group className="mb-4">
                                <Form.Label className="text-white-50 small mb-2 uppercase tracking-wide fw-semibold" style={{ fontSize: '10px' }}>Name your collection</Form.Label>
                                <Form.Control 
                                    required
                                    value={newAlbumName}
                                    onChange={(e) => setNewAlbumName(e.target.value)}
                                    placeholder="e.g. Summer Vacation, Family..."
                                    className="bg-white bg-opacity-5 border-0 text-white rounded-3 py-2 px-3 shadow-none focus-primary"
                                    autoFocus
                                />
                            </Form.Group>
                            <Form.Group className="mb-0">
                                <Form.Label className="text-white-50 small mb-2 uppercase tracking-wide fw-semibold" style={{ fontSize: '10px' }}>Description (optional)</Form.Label>
                                <Form.Control 
                                    as="textarea"
                                    rows={3}
                                    value={newAlbumDesc}
                                    onChange={(e) => setNewAlbumDesc(e.target.value)}
                                    placeholder="Tell the story of this album..."
                                    className="bg-white bg-opacity-5 border-0 text-white rounded-3 px-3 py-2 shadow-none focus-primary resize-none"
                                />
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer className="border-0 pt-4 pb-0 justify-content-end gap-2">
                            <Button variant="link" className="text-white-50 text-decoration-none px-4" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                            <Button variant="primary" type="submit" className="rounded-pill px-4 shadow">Add Album</Button>
                        </Modal.Footer>
                    </Form>
                </div>
            </Modal>

            <style>{`
                .album-card-v2 {
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 16px;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    background: rgba(15, 23, 42, 0.3);
                }
                .album-card-v2:hover {
                    transform: translateY(-8px);
                    border-color: var(--accent-primary);
                    box-shadow: 0 20px 40px -10px rgba(0,0,0,0.5);
                }
                .album-card-v2 img {
                    transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
                }
                .album-card-v2:hover img {
                    transform: scale(1.1);
                }
                .album-card-v2:hover .album-hover-overlay {
                    opacity: 1 !important;
                }
                .group:hover .scale-up {
                    transform: scale(1.2);
                }
                .scale-up { transform: scale(1); transition: transform 0.4s ease; }
                .tiny-text { font-size: 10px; }
                .uppercase { text-transform: uppercase; }
                .tracking-widest { letter-spacing: 0.1em; }
                .inset-0 { top: 0; left: 0; right: 0; bottom: 0; }
                .delete-btn {
                    opacity: 0;
                    transform: translateY(-10px);
                    transition: all 0.3s ease;
                }
                .album-card-v2:hover .delete-btn {
                    opacity: 1;
                    transform: translateY(0);
                }
                .hover-scale:hover { transform: scale(1.1); }
                .focus-primary:focus {
                    background: rgba(255,255,255,0.08) !important;
                    box-shadow: 0 0 0 2px var(--accent-primary) !important;
                }
                .resize-none { resize: none; }
                .z-index-10 { z-index: 10; }
            `}</style>
        </div>
    );
};

export default Albums;
