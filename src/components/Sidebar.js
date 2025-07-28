import React, { useState, useEffect } from 'react';
import FeatureList from './FeatureList';
import { Box, Typography, TextField, Button, Stack, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const Sidebar = ({
    features,
    feature: selectedFeature,
    onClose,
    onFeatureHover,
    onFeatureClick,
    onEdit,
    isEditing,
    onUpdate,
    onDelete,
    searchTerm,
    onSearchChange
}) => {

    const [editableName, setEditableName] = useState('');

    useEffect(() => {
        if (selectedFeature) {
            setEditableName(selectedFeature.get('name') || '');
        }
    }, [selectedFeature]);

    const handleUpdateClick = () => {
        onUpdate(selectedFeature.getId(), editableName);
    };

    const handleDeleteClick = () => {
        if (window.confirm(`Are you sure you want to delete "${selectedFeature.get('name')}"?`)) {
            onDelete(selectedFeature.getId());
        }
    };

    // MUI'ın Box bileşeni, stil ve layout için standart div'in gelişmiş halidir.
    return (
        <Box sx={{
            width: 280,
            height: '100%',
            flexShrink: 0,
            bgcolor: 'background.paper', // Temadan gelen arkaplan rengini kullanır
            p: 2, // padding: 2 birim (16px)
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
        }}>
            {selectedFeature ? (
                // BİR OBJE SEÇİLİYSE DETAY GÖRÜNÜMÜ
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">Feature Details</Typography>
                        <Button onClick={onClose} size="small">Back to List</Button>
                    </Box>
                    {isEditing ? (
                        // Düzenleme Modu
                        <Stack spacing={2}>
                            <Typography variant="body1"><strong>ID:</strong> {selectedFeature.getId()}</Typography>
                            <TextField
                                fullWidth
                                label="Name"
                                variant="outlined"
                                value={editableName}
                                onChange={(e) => setEditableName(e.target.value)}
                            />
                            <Typography variant="caption" color="text.secondary">Modify the shape on the map directly.</Typography>
                            <Button onClick={handleUpdateClick} variant="contained" fullWidth>Save Name Changes</Button>
                        </Stack>
                    ) : (
                        // Detay Görüntüleme Modu
                        <Stack spacing={1}>
                            <Typography variant="body1"><strong>ID:</strong> {selectedFeature.getId()}</Typography>
                            <Typography variant="body1"><strong>Name:</strong> {selectedFeature.get('name') || 'No Name'}</Typography>
                            <Typography variant="body1"><strong>Type:</strong> {selectedFeature.getGeometry().getType()}</Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                <Button onClick={onEdit} variant="outlined" fullWidth>Edit</Button>
                                <Button onClick={handleDeleteClick} variant="contained" color="error" fullWidth>Delete</Button>
                            </Stack>
                        </Stack>
                    )}
                </>
            ) : (
                // HİÇBİR OBJE SEÇİLİ DEĞİLSE TÜM LİSTEYİ GÖSTER
                <>
                    <Typography variant="h6" sx={{ mb: 2 }}>All Features</Typography>
                    <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Search by name..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ mb: 2 }}
                    />
                    <FeatureList
                        features={features}
                        onFeatureHover={onFeatureHover}
                        onFeatureClick={onFeatureClick}
                        searchTerm={searchTerm}
                    />
                </>
            )}
        </Box>
    );
};

export default Sidebar;