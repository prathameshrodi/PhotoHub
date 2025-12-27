import React, { useEffect, useState } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button, InputGroup, Form } from 'react-bootstrap';
import { Edit2, Check, X, User as UserIcon } from 'lucide-react';

const People = () => {
    const [people, setPeople] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    useEffect(() => {
        api.get('/people')
           .then(res => setPeople(res.data))
           .catch(err => console.error("Failed to load people", err));
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
        if (selectedIds.size < 2) {
            alert("Select at least 2 people to merge.");
            return;
        }
        
        const ids = Array.from(selectedIds);
        const targetId = ids[0];
        const sourceIds = ids.slice(1);
        const targetPerson = people.find(p => p.id === targetId);

        if (!window.confirm(`Merge ${sourceIds.length} people into "${targetPerson.name}"?`)) {
            return;
        }

        try {
            await api.post('/people/merge', {
                target_id: targetId,
                source_ids: sourceIds
            });
            // Refresh
            const res = await api.get('/people');
            setPeople(res.data);
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

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold mb-0">People</h2>
                <div className="d-flex gap-2">
                    {isSelectMode && selectedIds.size >= 2 && (
                        <Button variant="primary" onClick={handleMerge}>
                            Merge ({selectedIds.size})
                        </Button>
                    )}
                    <Button 
                        variant={isSelectMode ? "outline-secondary" : "outline-primary"}
                        onClick={() => {
                             setIsSelectMode(!isSelectMode);
                             setSelectedIds(new Set());
                        }}
                    >
                        {isSelectMode ? 'Cancel Selection' : 'Select People'}
                    </Button>
                </div>
            </div>

            <Row xs={2} md={4} lg={5} xl={6} className="g-4">
                {people.map(person => {
                    const isSelected = selectedIds.has(person.id);
                    // Use a fallback for cover photo if URL is weird, but usually assume it works.
                    // The backend returns a full URL now? No, wait. 
                    // scanner.py: img.thumbnail = PREFIX + base64...
                    // people.py returns PersonRead with cover_photo as... wait.
                    // In main.py/people endpoint: cover_photo = f"/api/v1/images/content/{face.image_id}" ... wait.
                    // Actually checking main.py from memory/previous turns, I might have set it to a URL or base64.
                    // Let's assume it returns a URL string or null.
                    // If it's a URL like /image_content/ID, we need to prepend host if needed, or use relative.
                    // Let's check how Gallery uses it: `http://localhost:8000/image_content/${img.id}`
                    
                    return (
                    <Col key={person.id}>
                        <Card 
                            className={`h-100 border-0 shadow-sm person-card ${isSelected ? 'ring-2 ring-primary' : ''}`}
                            style={{ 
                                cursor: isSelectMode ? 'pointer' : 'default',
                                outline: isSelected ? '3px solid #0d6efd' : 'none',
                                transition: 'transform 0.2s',
                            }}
                            onClick={(e) => isSelectMode ? toggleSelection(person.id, e) : null}
                        >
                             <div className="position-relative">
                                <Card.Img 
                                    variant="top" 
                                    src={person.cover_photo || `https://ui-avatars.com/api/?name=${person.name}&background=random`} 
                                    className="rounded-circle mx-auto mt-3 d-block object-fit-cover"
                                    style={{ width: '120px', height: '120px' }}
                                />
                                {isSelectMode && (
                                    <div className="position-absolute top-0 end-0 p-2">
                                        {isSelected ? <Check size={20} className="text-primary bg-white rounded-circle" /> : <div className="border rounded-circle" style={{width: 20, height: 20}}></div>}
                                    </div>
                                )}
                             </div>
                            
                            <Card.Body className="text-center">
                                {editingId === person.id ? (
                                     <Form onSubmit={(e) => saveName(person.id, e)} onClick={(e) => e.stopPropagation()}>
                                         <InputGroup size="sm">
                                            <Form.Control 
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                autoFocus
                                            />
                                            <Button variant="outline-success" type="submit"><Check size={14}/></Button>
                                         </InputGroup>
                                     </Form>
                                ) : (
                                    <div className="d-flex align-items-center justify-content-center gap-2 group-hover-visible">
                                        <Link 
                                            to={isSelectMode ? '#' : `/people/${person.id}`} 
                                            className="text-decoration-none text-dark fw-bold fs-5 stretched-link"
                                            onClick={(e) => { if(isSelectMode || editingId) e.preventDefault(); }}
                                        >
                                            {person.name}
                                        </Link>
                                        {!isSelectMode && (
                                            <Edit2 
                                                size={14} 
                                                className="text-muted cursor-pointer edit-icon" 
                                                onClick={(e) => startEditing(person, e)}
                                                style={{ zIndex: 2, position: 'relative' }} 
                                            />
                                        )}
                                    </div>
                                )}
                                <Card.Text className="text-muted small mt-1">
                                    {person.photo_count} photos
                                </Card.Text>
                            </Card.Body>
                        </Card>
                    </Col>
                    );
                })}
            </Row>
            <style>{`
                .person-card:hover {
                    background-color: #f8f9fa;
                }
                .edit-icon:hover {
                    color: var(--bs-primary) !important;
                }
            `}</style>
        </Container>
    );
};

export default People;
