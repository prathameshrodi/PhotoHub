import React, { useEffect, useState } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Button, InputGroup, Form, Spinner } from 'react-bootstrap';
import { Edit2, Check, X, Users, Merge, Trash2, Search, ArrowRight, CheckSquare } from 'lucide-react';
import { API_BASE_URL } from '../api';

const People = () => {
    const [people, setPeople] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState("");

    const fetchPeople = (showLoadingIndicator = true) => {
        if (showLoadingIndicator) setLoading(true);
        api.get('/people')
           .then(res => setPeople(res.data))
           .catch(err => console.error("Failed to load people", err))
           .finally(() => {
                setLoading(false);
           });
    };

    useEffect(() => {
        // Initial fetch: loading already true by default.
        // We do it directly here to satisfy the "no sync setState in effect" lint
        api.get('/people')
           .then(res => setPeople(res.data))
           .catch(err => console.error("Failed to load people", err))
           .finally(() => setLoading(false));
    }, []);

    const toggleSelection = (id, e) => {
        if (!isSelectMode) return;
        e.preventDefault();
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleMerge = async () => {
        if (selectedIds.size < 2) return;
        
        const ids = Array.from(selectedIds);
        const targetId = ids[0];
        const sourceIds = ids.slice(1);
        const targetPerson = people.find(p => p.id === targetId);

        if (!window.confirm(`Merge ${sourceIds.length} people into "${targetPerson.name}"?`)) return;

        try {
            await api.post('/people/merge', { target_id: targetId, source_ids: sourceIds });
            fetchPeople();
            setSelectedIds(new Set());
            setIsSelectMode(false);
        } catch (error) {
            console.error("Merge failed", error);
            alert("Merge failed");
        }
    };

    const startEditing = (person, e) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingId(person.id);
        setEditName(person.name);
    };

    const saveName = async (id, e) => {
        e.preventDefault();
        try {
            await api.put(`/people/${id}`, { name: editName });
            setPeople(people.map(p => p.id === id ? { ...p, name: editName } : p));
            setEditingId(null);
        } catch (error) {
            console.error("Failed to update name", error);
        }
    };

    const filteredPeople = people.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="fade-in">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
                <div>
                     <h2 className="fw-bold text-white mb-1 d-flex align-items-center gap-2">
                        <Users size={28} className="text-primary" />
                        People
                    </h2>
                    <p className="text-white-50 mb-0">Recognized faces in your library</p>
                </div>

                <div className="d-flex align-items-center gap-2">
                    <div className="position-relative me-2 d-none d-md-block" style={{ width: '240px' }}>
                        <Search className="position-absolute top-50 translate-middle-y ms-3 text-white-50" size={14} />
                        <Form.Control 
                            placeholder="Find person..." 
                            className="ps-5 rounded-pill border-0 bg-secondary-subtle small py-2"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {isSelectMode ? (
                        <>
                            <Button 
                                variant="danger" 
                                className="rounded-pill px-4 d-flex align-items-center gap-2 border-0"
                                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                                onClick={() => { setIsSelectMode(false); setSelectedIds(new Set()); }}
                            >
                                <X size={18} />
                                <span className="fw-medium">Cancel</span>
                            </Button>
                            {selectedIds.size >= 2 && (
                                <Button 
                                    variant="primary" 
                                    className="rounded-pill px-4 shadow-sm d-flex align-items-center gap-2"
                                    onClick={handleMerge}
                                >
                                    <Merge size={18} />
                                    Merge ({selectedIds.size})
                                </Button>
                            )}
                        </>
                    ) : (
                        <Button 
                            variant="outline-primary" 
                            className="rounded-pill px-4 py-2 d-flex align-items-center gap-2 border-0"
                            style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}
                            onClick={() => setIsSelectMode(true)}
                        >
                            <CheckSquare size={18} />
                            <span className="fw-medium">Select</span>
                        </Button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                </div>
            ) : (
                <Row xs={1} sm={2} md={3} lg={4} xl={5} xxl={6} className="g-4">
                    {filteredPeople.map(person => {
                        const isSelected = selectedIds.has(person.id);
                        let coverSrc = person.cover_photo;
                        if (coverSrc) {
                            if (!coverSrc.startsWith('http')) {
                                coverSrc = `${API_BASE_URL}/${coverSrc.replace(/^\//, '')}`;
                            }
                        } else {
                            coverSrc = `https://ui-avatars.com/api/?name=${person.name}&background=random&size=200`;
                        }

                        return (
                            <Col key={person.id}>
                                <div 
                                    className={`person-card-v2 position-relative ${isSelected ? 'selected' : ''}`}
                                    onClick={(e) => isSelectMode && toggleSelection(person.id, e)}
                                >
                                    <div className="card-inner glass-card p-3 d-flex flex-column align-items-center text-center">
                                        <div className="avatar-container mb-3 position-relative">
                                            <div className="avatar-ring"></div>
                                            <img 
                                                src={coverSrc} 
                                                alt={person.name} 
                                                className="rounded-circle avatar-img object-fit-cover shadow"
                                            />
                                            {isSelectMode && (
                                                <div className={`selection-indicator ${isSelected ? 'active' : ''}`}>
                                                    <Check size={14} color="white" />
                                                </div>
                                            )}
                                        </div>

                                        {editingId === person.id ? (
                                            <Form onSubmit={(e) => saveName(person.id, e)} className="w-100 mb-2">
                                                <InputGroup size="sm">
                                                    <Form.Control 
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        autoFocus
                                                        className="rounded-start-pill ps-3"
                                                    />
                                                    <Button variant="primary" type="submit" className="rounded-end-pill px-3"><Check size={14}/></Button>
                                                </InputGroup>
                                            </Form>
                                        ) : (
                                            <div className="d-flex align-items-center justify-content-center gap-2 mb-1 w-100 px-2 overflow-hidden">
                                                <h3 className="fs-6 fw-bold text-white text-truncate m-0">
                                                    {person.name}
                                                </h3>
                                                {!isSelectMode && (
                                                    <button 
                                                        className="btn btn-link p-0 text-white-50 hover-text-white edit-btn opacity-0"
                                                        onClick={(e) => startEditing(person, e)}
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        
                                        <div className="text-white-50 small mb-3">
                                            {person.photo_count} {person.photo_count === 1 ? 'photo' : 'photos'}
                                        </div>

                                        <Link 
                                            to={isSelectMode ? '#' : `/people/${person.id}`} 
                                            className={`btn btn-sm w-100 rounded-pill mt-auto transition-all ${isSelectMode ? 'disabled opacity-25' : 'btn-outline-primary hover-bg-primary'}`}
                                            onClick={(e) => isSelectMode && e.preventDefault()}
                                        >
                                            View Memories
                                            <ArrowRight size={12} className="ms-2" />
                                        </Link>
                                    </div>
                                </div>
                            </Col>
                        );
                    })}
                </Row>
            )}

            <style>{`
                .person-card-v2 {
                    cursor: pointer;
                    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .person-card-v2:hover {
                    transform: translateY(-8px);
                }
                .person-card-v2.selected {
                    transform: scale(0.95);
                }
                .card-inner {
                    height: 100%;
                    border: 1px solid rgba(255,255,255,0.05);
                    background: rgba(30, 41, 59, 0.5);
                    backdrop-filter: blur(10px);
                }
                .avatar-container {
                    width: 100px;
                    height: 100px;
                }
                .avatar-img {
                    width: 100%;
                    height: 100%;
                    position: relative;
                    z-index: 2;
                }
                .avatar-ring {
                    position: absolute;
                    inset: -4px;
                    border: 2px solid var(--accent-primary);
                    border-radius: 50%;
                    opacity: 0.3;
                    z-index: 1;
                    transition: all 0.3s ease;
                }
                .person-card-v2:hover .avatar-ring {
                    opacity: 0.8;
                    inset: -6px;
                }
                .selection-indicator {
                    position: absolute;
                    top: -2px;
                    right: -2px;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.1);
                    border: 2px solid rgba(255,255,255,0.2);
                    z-index: 10;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }
                .selection-indicator.active {
                    background: var(--accent-primary);
                    border-color: white;
                    transform: scale(1.1);
                    box-shadow: 0 0 10px var(--accent-primary);
                }
                .person-card-v2:hover .edit-btn {
                    opacity: 1;
                }
                .hover-bg-primary:hover {
                    background-color: var(--accent-primary) !important;
                    color: white !important;
                }
                .bg-secondary-subtle {
                    background-color: rgba(255,255,255,0.05) !important;
                }
            `}</style>
        </div>
    );
};

export default People;
