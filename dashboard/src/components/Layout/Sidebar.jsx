import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Collapse,
  Typography,
} from '@mui/material';
import {
  Dashboard,
  Warning,
  Analytics,
  Map,
  TrendingUp,
  Settings,
  Help,
  ExpandLess,
  ExpandMore,
  Thermostat,
  Water,
  Air,
  Speed,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

const drawerWidth = 240;
const collapsedWidth = 60;

const Sidebar = ({ open, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState({});

  const handleItemClick = (path) => {
    navigate(path);
  };

  const handleExpandClick = (item) => {
    setExpandedItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Dashboard />,
      path: '/dashboard',
    },
    {
      id: 'alerts',
      label: 'Emergency Alerts',
      icon: <Warning />,
      path: '/alerts',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <Analytics />,
      path: '/analytics',
    },
    {
      id: 'monitoring',
      label: 'Climate Monitoring',
      icon: <TrendingUp />,
      expandable: true,
      children: [
        {
          id: 'temperature',
          label: 'Temperature',
          icon: <Thermostat />,
          path: '/monitoring/temperature',
        },
        {
          id: 'precipitation',
          label: 'Precipitation',
          icon: <Water />,
          path: '/monitoring/precipitation',
        },
        {
          id: 'air-quality',
          label: 'Air Quality',
          icon: <Air />,
          path: '/monitoring/air-quality',
        },
        {
          id: 'wind',
          label: 'Wind Patterns',
          icon: <Speed />,
          path: '/monitoring/wind',
        },
      ],
    },
    {
      id: 'maps',
      label: 'Interactive Maps',
      icon: <Map />,
      expandable: true,
      children: [
        {
          id: 'climate-map',
          label: 'Climate Map',
          icon: <Map />,
          path: '/maps/climate',
        },
        {
          id: 'alert-map',
          label: 'Alert Map',
          icon: <Warning />,
          path: '/maps/alerts',
        },
      ],
    },
  ];

  const bottomMenuItems = [
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings />,
      path: '/settings',
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: <Help />,
      path: '/help',
    },
  ];

  const renderMenuItem = (item, isChild = false) => {
    const hasChildren = item.expandable && item.children;
    const isExpanded = expandedItems[item.id];
    const active = isActive(item.path);

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            onClick={() => {
              if (hasChildren) {
                handleExpandClick(item.id);
              } else if (item.path) {
                handleItemClick(item.path);
              }
            }}
            sx={{
              minHeight: 48,
              justifyContent: open ? 'initial' : 'center',
              px: 2.5,
              pl: isChild ? 4 : 2.5,
              backgroundColor: active ? 'primary.main' : 'transparent',
              color: active ? 'white' : 'inherit',
              '&:hover': {
                backgroundColor: active ? 'primary.dark' : 'action.hover',
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 3 : 'auto',
                justifyContent: 'center',
                color: active ? 'white' : 'inherit',
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              sx={{ opacity: open ? 1 : 0 }}
            />
            {hasChildren && open && (
              isExpanded ? <ExpandLess /> : <ExpandMore />
            )}
          </ListItemButton>
        </ListItem>

        {hasChildren && (
          <Collapse in={isExpanded && open} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map(child => renderMenuItem(child, true))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? drawerWidth : collapsedWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? drawerWidth : collapsedWidth,
          boxSizing: 'border-box',
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
        },
      }}
    >
      <Box sx={{ overflow: 'auto', mt: 8 }}>
        {/* Main Navigation */}
        <List>
          {menuItems.map(item => renderMenuItem(item))}
        </List>

        <Divider />

        {/* Bottom Navigation */}
        <List>
          {bottomMenuItems.map(item => renderMenuItem(item))}
        </List>

        {/* Version Info */}
        {open && (
          <Box sx={{ p: 2, mt: 'auto' }}>
            <Typography variant="caption" color="text.secondary" align="center" display="block">
              ClimateGuardian AI
            </Typography>
            <Typography variant="caption" color="text.secondary" align="center" display="block">
              v1.0.0
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default Sidebar;
