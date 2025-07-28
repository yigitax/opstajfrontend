import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import 'ol/ol.css';
import { Map, View, Overlay } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Draw, Select, Modify } from 'ol/interaction';
import { Style, Fill, Stroke, Text, Circle as CircleStyle } from 'ol/style';
import { LineString, Polygon } from 'ol/geom';
import { getArea, getLength } from 'ol/sphere';
import { unByKey } from 'ol/Observable';
import WKT from 'ol/format/WKT';
import { toast } from 'react-toastify';
import MeasureTooltip from './MeasureTooltip';

// MUI Dialog bileþenlerini import ediyoruz.
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

const MapComponent = forwardRef(({ features, onFeatureAdd, onFeatureModify, drawType, measureType, selectedFeature, onFeatureSelect, isEditing, hoveredFeatureId, onDrawCancel }, ref) => {
    const mapRef = useRef();
    const mapInstance = useRef(null);
    const vectorLayerRef = useRef(null);
    const measureSource = useRef(new VectorSource());
    const interactions = useRef({ draw: null, select: null, modify: null, measure: null });
    const wktFormat = new WKT();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [featureName, setFeatureName] = useState('');
    const [currentFeatureData, setCurrentFeatureData] = useState(null);

    useImperativeHandle(ref, () => ({
        goToLocation: (coords) => {
            if (mapInstance.current) {
                mapInstance.current.getView().animate({
                    center: fromLonLat(coords),
                    zoom: 14,
                    duration: 1500,
                });
            }
        },
        syncSelection: (feature) => {
            if (interactions.current.select) {
                const selectInteraction = interactions.current.select;
                selectInteraction.getFeatures().clear();
                if (feature) {
                    selectInteraction.getFeatures().push(feature);
                }
            }
        }
    }));

    // SADECE HARÝTA KURULUMU ÝÇÝN useEffect
    useEffect(() => {
        if (!mapRef.current || mapInstance.current) return;

        const vectorSource = new VectorSource();
        const vectorLayer = new VectorLayer({ source: vectorSource });
        vectorLayerRef.current = vectorLayer;

        const measureLayer = new VectorLayer({
            source: measureSource.current,
            style: new Style({
                fill: new Fill({ color: 'rgba(255, 255, 255, 0.2)' }),
                stroke: new Stroke({ color: '#ffcc33', width: 2 }),
            }),
        });

        const map = new Map({
            target: mapRef.current,
            layers: [new TileLayer({ source: new OSM() }), measureLayer, vectorLayer],
            view: new View({ center: fromLonLat([35.0, 39.0]), zoom: 6 }),
        });
        mapInstance.current = map;

        interactions.current.select = new Select({ layers: [vectorLayer] });
        map.addInteraction(interactions.current.select);
        interactions.current.select.on('select', (event) => {
            onFeatureSelect(event.selected.length > 0 ? event.selected[0] : null);
        });

        interactions.current.modify = new Modify({ features: interactions.current.select.getFeatures() });
        map.addInteraction(interactions.current.modify);
        interactions.current.modify.on('modifyend', (event) => {
            const modifiedFeature = event.features.getArray()[0];
            const updatedData = { wktString: wktFormat.writeGeometry(modifiedFeature.getGeometry().clone().transform('EPSG:3857', 'EPSG:4326')) };
            onFeatureModify(modifiedFeature.getId(), updatedData);
        });

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onDrawCancel();
        };
        const mapElement = map.getTargetElement();
        mapElement.addEventListener('keydown', handleKeyDown);

        setTimeout(() => map.updateSize(), 200);

        return () => {
            if (mapInstance.current) {
                mapInstance.current.setTarget(undefined);
                mapInstance.current = null;
                mapElement.removeEventListener('keydown', handleKeyDown);
            }
        };
    }, []);

    // VERÝ GÜNCELLEME useEffect
    useEffect(() => {
        if (vectorLayerRef.current) {
            const source = vectorLayerRef.current.getSource();
            source.clear();
            source.addFeatures(features);
        }
    }, [features]);

    // STÝL VE ODAKLANMA YÖNETÝCÝSÝ useEffect
    useEffect(() => {
        if (!vectorLayerRef.current) return;

        const styleFunction = (feature) => {
            const isSelected = selectedFeature && feature.getId() === selectedFeature.getId();
            const isHovered = hoveredFeatureId && feature.getId() === hoveredFeatureId;
            const style = new Style({
                fill: new Fill({ color: isSelected ? 'rgba(0, 150, 255, 0.4)' : isHovered ? 'rgba(255, 100, 100, 0.4)' : 'rgba(255, 255, 255, 0.3)' }),
                stroke: new Stroke({ color: isSelected ? 'rgba(0, 150, 255, 1)' : isHovered ? 'rgba(255, 0, 0, 1)' : '#ffcc33', width: 3 }),
                image: new CircleStyle({
                    radius: isSelected || isHovered ? 8 : 7,
                    fill: new Fill({ color: isSelected ? 'rgba(0, 150, 255, 1)' : isHovered ? 'rgba(255, 0, 0, 1)' : '#ffcc33' }),
                }),
            });
            style.setText(new Text({
                text: feature.get('name') || '', font: '14px Calibri,sans-serif',
                fill: new Fill({ color: '#000' }), stroke: new Stroke({ color: '#fff', width: 4 }),
                offsetY: -20,
            }));
            return style;
        };

        vectorLayerRef.current.setStyle(styleFunction);

        if (selectedFeature && mapInstance.current) {
            const geometry = selectedFeature.getGeometry();
            if (geometry) {
                mapInstance.current.getView().fit(geometry.getExtent(), {
                    padding: [150, 150, 150, 150],
                    duration: 1000,
                    maxZoom: 15,
                });
            }
        }
    }, [selectedFeature, hoveredFeatureId]);

    // ETKÝLEÞÝM YÖNETÝCÝSÝ useEffect
    useEffect(() => {
        if (!mapInstance.current) return;

        if (interactions.current.draw) mapInstance.current.removeInteraction(interactions.current.draw);
        if (interactions.current.measure) mapInstance.current.removeInteraction(interactions.current.measure);

        interactions.current.select.setActive(!drawType && !isEditing && !measureType);
        interactions.current.modify.setActive(isEditing);
        mapInstance.current.getTargetElement().style.cursor = '';

        if (drawType) {
            const vectorSource = vectorLayerRef.current.getSource();
            mapInstance.current.getTargetElement().style.cursor = 'crosshair';
            const newDraw = new Draw({ source: vectorSource, type: drawType });
            newDraw.on('drawend', (event) => {
                const feature = event.feature;
                const wktString = wktFormat.writeGeometry(feature.getGeometry().clone().transform('EPSG:3857', 'EPSG:4326'));
                setCurrentFeatureData({ feature, type: drawType, wktString });
                setIsModalOpen(true);
            });
            interactions.current.draw = newDraw;
            mapInstance.current.addInteraction(newDraw);
        } else if (measureType) {
            const measureTooltipOverlay = mapInstance.current.get('measureTooltip');
            const measureTooltipElement = measureTooltipOverlay.getElement();
            const formatOutput = (geom) => {
                if (geom instanceof Polygon) {
                    const area = getArea(geom);
                    return area > 10000 ? `${(area / 1000000).toFixed(2)} km²` : `${area.toFixed(2)} m²`;
                } else if (geom instanceof LineString) {
                    const length = getLength(geom);
                    return length > 100 ? `${(length / 1000).toFixed(2)} km` : `${length.toFixed(2)} m`;
                }
                return '';
            };
            const newMeasureDraw = new Draw({ source: measureSource.current, type: measureType });
            interactions.current.measure = newMeasureDraw;
            mapInstance.current.addInteraction(newMeasureDraw);
            let listener;
            newMeasureDraw.on('drawstart', (evt) => {
                measureSource.current.clear();
                const sketch = evt.feature;
                listener = sketch.getGeometry().on('change', (e) => {
                    const geom = e.target;
                    const output = formatOutput(geom);
                    measureTooltipOverlay.setPosition(geom.getLastCoordinate());
                    measureTooltipElement.innerHTML = output;
                });
                measureTooltipElement.innerHTML = 'Click to start measuring';
                measureTooltipOverlay.setPosition(evt.coordinate);
                measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure visible';
            });
            newMeasureDraw.on('drawend', ({ feature }) => {
                measureTooltipElement.className = 'ol-tooltip ol-tooltip-static visible';
                measureTooltipOverlay.setOffset([0, -7]);
                unByKey(listener);
            });
        }
    }, [drawType, isEditing, measureType]);

    const closeModal = () => {
        if (currentFeatureData?.feature) {
            const source = vectorLayerRef.current.getSource();
            if (source) source.removeFeature(currentFeatureData.feature);
        }
        setIsModalOpen(false);
        setFeatureName('');
        setCurrentFeatureData(null);
    };

    const handleSaveFeature = (event) => {
        event.preventDefault();
        if (!featureName.trim()) {
            toast.warn("Feature name cannot be empty.");
            return;
        }
        const newFeatureData = {
            type: currentFeatureData.type,
            name: featureName,
            wktString: currentFeatureData.wktString,
        };
        onFeatureAdd(newFeatureData);
        closeModal();
    };

    return (
        <div className="map-container" ref={mapRef} tabIndex="0">
            <MeasureTooltip map={mapInstance.current} />
            <Dialog open={isModalOpen} onClose={closeModal}>
                <DialogTitle>Add Feature Name</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Please enter a name for the new feature you have drawn on the map.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="name"
                        label="Feature Name"
                        type="text"
                        fullWidth
                        variant="standard"
                        value={featureName}
                        onChange={(e) => setFeatureName(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleSaveFeature(e);
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeModal}>Cancel</Button>
                    <Button onClick={handleSaveFeature} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
});

export default MapComponent;