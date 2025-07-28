import React, { useMemo } from 'react';
import { List, ListItemButton, ListItemText, Typography, ListSubheader, Divider } from '@mui/material';

const FeatureList = ({ features, onFeatureHover, onFeatureClick, searchTerm }) => {

    const groupedFeatures = useMemo(() => {
        const filteredFeatures = features.filter(feature => {
            const name = feature.get('name') || '';
            return name.toLowerCase().includes(searchTerm.toLowerCase());
        });
        return filteredFeatures.reduce((acc, feature) => {
            const type = feature.getGeometry().getType();
            if (!acc[type]) {
                acc[type] = [];
            }
            acc[type].push(feature);
            return acc;
        }, {});
    }, [features, searchTerm]);

    const groupOrder = ['Point', 'LineString', 'Polygon'];
    const isResultEmpty = Object.keys(groupedFeatures).every(key => groupedFeatures[key].length === 0);

    return (
        <List sx={{ width: '100%' }}>
            {isResultEmpty && searchTerm ? (
                <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                    No features found.
                </Typography>
            ) : (
                groupOrder.map(groupName => (
                    groupedFeatures[groupName] && groupedFeatures[groupName].length > 0 && (
                        <li key={`section-${groupName}`}>
                            <ul>
                                <ListSubheader sx={{ bgcolor: 'background.paper' }}>
                                    {`${groupName}s (${groupedFeatures[groupName].length})`}
                                </ListSubheader>
                                {groupedFeatures[groupName].map(feature => (
                                    <ListItemButton
                                        key={feature.getId()}
                                        onMouseEnter={() => onFeatureHover(feature.getId())}
                                        onMouseLeave={() => onFeatureHover(null)}
                                        onClick={() => onFeatureClick(feature)}
                                    >
                                        <ListItemText primary={feature.get('name') || `ID: ${feature.getId()}`} />
                                    </ListItemButton>
                                ))}
                                <Divider />
                            </ul>
                        </li>
                    )
                ))
            )}
        </List>
    );
};

export default FeatureList;