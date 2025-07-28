import React, { useState, useEffect, useMemo, useRef } from 'react';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar';
import Legend from './components/Legend';
import Spinner from './components/Spinner';
import GeocodingSearch from './components/GeocodingSearch';
import './App.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import WKT from 'ol/format/WKT';
import GeoJSON from 'ol/format/GeoJSON';

// MUI Tema ve Bileþen import'larý
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Stack from '@mui/material/Stack';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import StraightenIcon from '@mui/icons-material/Straighten';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

const API_URL = 'https://localhost:7001/api/features';

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        secondary: {
            main: '#90caf9', // Açýk mavi gibi ikincil bir renk
        },
    },
});

function App() {
    const [features, setFeatures] = useState([]);
    const [drawType, setDrawType] = useState(null);
    const [measureType, setMeasureType] = useState(null);
    const [selectedFeature, setSelectedFeature] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [hoveredFeatureId, setHoveredFeatureId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [visibility, setVisibility] = useState({ Point: true, LineString: true, Polygon: true });
    const [isLoading, setIsLoading] = useState(true);
    const mapComponentRef = useRef();

    useEffect(() => {
        const wktFormat = new WKT();
        axios.get(API_URL).then(response => {
            if (response.data.success) {
                const featuresFromApi = response.data.data.map(dto => {
                    const feature = wktFormat.readFeature(dto.wktString, {
                        dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'
                    });
                    feature.setId(dto.id);
                    feature.set('name', dto.name);
                    return feature;
                });
                setFeatures(featuresFromApi);
            }
        }).catch(() => toast.error("Could not load initial data."))
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        if (!selectedFeature) { setIsEditing(false); }
    }, [selectedFeature]);

    const filteredFeatures = useMemo(() => {
        const visibleTypes = Object.keys(visibility).filter(type => visibility[type]);
        return features.filter(feature => {
            const featureType = feature.getGeometry().getType();
            return visibleTypes.includes(featureType);
        });
    }, [features, visibility]);

    const runAsync = async (task) => {
        setIsLoading(true);
        try {
            await task();
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || "An unexpected error occurred.";
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFeatureAdd = async (newFeatureData) => {
        await runAsync(async () => {
            const response = await axios.post(API_URL, newFeatureData);
            if (response.data.success) {
                const wktFormat = new WKT();
                const savedDto = response.data.data;
                const newFeature = wktFormat.readFeature(savedDto.wktString, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
                newFeature.setId(savedDto.id);
                newFeature.set('name', savedDto.name);
                setFeatures(prev => [...prev, newFeature]);
                toast.success('Feature saved!');
            } else {
                toast.error("Save failed: " + response.data.message);
            }
        });
    };

    const handleUpdateFeature = async (id, updatedData) => {
        await runAsync(async () => {
            const featureToUpdate = features.find(f => f.getId() === id);
            if (!featureToUpdate) return;

            const wktFormat = new WKT();
            const updatedDto = {
                id: id,
                name: updatedData.name !== undefined ? updatedData.name : featureToUpdate.get('name'),
                type: featureToUpdate.getGeometry().getType(),
                wktString: updatedData.wktString || wktFormat.writeGeometry(featureToUpdate.getGeometry().clone().transform('EPSG:3857', 'EPSG:4326'))
            };

            const response = await axios.put(`${API_URL}/${id}`, updatedDto);
            if (response.data.success) {
                const updatedFeature = featureToUpdate.clone();
                if (updatedData.name !== undefined) updatedFeature.set('name', updatedData.name);
                if (updatedData.wktString) {
                    const newGeom = wktFormat.readFeature(updatedData.wktString, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' }).getGeometry();
                    updatedFeature.setGeometry(newGeom);
                }
                setFeatures(features.map(f => f.getId() === id ? updatedFeature : f));
                toast.success("Feature updated!");
            } else {
                toast.error("Update failed: " + response.data.message);
            }
            setIsEditing(false);
        });
    };

    const handleFeatureDelete = async (id) => {
        await runAsync(async () => {
            const response = await axios.delete(`${API_URL}/${id}`);
            if (response.data.success) {
                toast.success("Feature deleted!");
                setFeatures(prev => prev.filter(f => f.getId() !== id));
                setSelectedFeature(null);
            } else {
                toast.error("Delete failed: " + response.data.message);
            }
        });
    };

    const handleLocationSelect = (coords) => {
        if (mapComponentRef.current) {
            mapComponentRef.current.goToLocation(coords);
        }
    };

    const handleMeasureTypeChange = (type) => {
        setDrawType(null);
        setIsEditing(false);
        setSelectedFeature(null);
        setMeasureType(prev => (prev === type ? null : type));
    };

    const handleExportGeoJSON = () => {
        if (filteredFeatures.length === 0) {
            toast.info("There is no data to export.");
            return;
        }
        try {
            const geojsonFormat = new GeoJSON();
            const geojsonString = geojsonFormat.writeFeatures(filteredFeatures, {
                featureProjection: 'EPSG:3857',
                dataProjection: 'EPSG:4326',
                pretty: true
            });
            const blob = new Blob([geojsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'turkey-map-features.geojson';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("Data exported successfully!");
        } catch (error) {
            console.error("Export failed:", error);
            toast.error("An error occurred during export.");
        }
    };

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <div className="App">
                {isLoading && <Spinner />}
                <ToastContainer position="top-right" autoClose={3000} theme="dark" />

                <header className="App-header">
                    <h2>Turkey Map Application</h2>
                    <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" flexWrap="wrap">
                        <ButtonGroup variant="contained" aria-label="add feature button group">
                            <Button startIcon={<AddCircleOutlineIcon />} onClick={() => { setDrawType('Point'); setMeasureType(null); setSelectedFeature(null); }}>Point</Button>
                            <Button startIcon={<AddCircleOutlineIcon />} onClick={() => { setDrawType('LineString'); setMeasureType(null); setSelectedFeature(null); }}>Line</Button>
                            <Button startIcon={<AddCircleOutlineIcon />} onClick={() => { setDrawType('Polygon'); setMeasureType(null); setSelectedFeature(null); }}>Polygon</Button>
                        </ButtonGroup>

                        <ButtonGroup variant="contained" aria-label="measurement button group">
                            <Button
                                startIcon={<StraightenIcon />}
                                onClick={() => handleMeasureTypeChange('LineString')}
                                color={measureType === 'LineString' ? 'primary' : 'inherit'}
                            >
                                Distance
                            </Button>
                            <Button
                                startIcon={<SquareFootIcon />}
                                onClick={() => handleMeasureTypeChange('Polygon')}
                                color={measureType === 'Polygon' ? 'primary' : 'inherit'}
                            >
                                Area
                            </Button>
                        </ButtonGroup>

                        <Button
                            variant="outlined"
                            color="secondary"
                            startIcon={<StopCircleIcon />}
                            onClick={() => { setDrawType(null); setMeasureType(null); }}
                        >
                            Stop
                        </Button>

                        <Button
                            variant="outlined"
                            color="secondary"
                            startIcon={<FileDownloadIcon />}
                            onClick={handleExportGeoJSON}
                        >
                            Export
                        </Button>
                    </Stack>
                </header>

                <div className='map-wrapper'>
                    <GeocodingSearch onLocationSelect={handleLocationSelect} />
                    <MapComponent
                        ref={mapComponentRef}
                        features={filteredFeatures}
                        onFeatureAdd={handleFeatureAdd}
                        onFeatureModify={handleUpdateFeature}
                        drawType={drawType}
                        measureType={measureType}
                        selectedFeature={selectedFeature}
                        onFeatureSelect={setSelectedFeature}
                        isEditing={isEditing}
                        hoveredFeatureId={hoveredFeatureId}
                        onDrawCancel={() => { setDrawType(null); setMeasureType(null); }}
                    />
                    <Legend visibility={visibility} onVisibilityChange={setVisibility} />
                    <Sidebar
                        features={filteredFeatures}
                        feature={selectedFeature}
                        onClose={() => setSelectedFeature(null)}
                        onFeatureHover={setHoveredFeatureId}
                        onFeatureClick={setSelectedFeature}
                        onEdit={() => setIsEditing(true)}
                        onDelete={handleFeatureDelete}
                        onUpdate={(id, newName) => handleUpdateFeature(id, { name: newName })}
                        isEditing={isEditing}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                    />
                </div>
            </div>
        </ThemeProvider>
    );
}

export default App;