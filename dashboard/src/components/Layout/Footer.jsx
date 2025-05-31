import React from 'react';
import { Box, Typography, Link, Divider } from '@mui/material';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        px: 3,
        mt: 'auto',
        backgroundColor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={2}
      >
        <Typography variant="body2" color="text.secondary">
          © 2025 ClimateGuardian AI. All rights reserved.
        </Typography>
        
        <Box display="flex" gap={2} alignItems="center">
          <Link
            href="/privacy"
            variant="body2"
            color="text.secondary"
            underline="hover"
          >
            Privacy Policy
          </Link>
          <Divider orientation="vertical" flexItem />
          <Link
            href="/terms"
            variant="body2"
            color="text.secondary"
            underline="hover"
          >
            Terms of Service
          </Link>
          <Divider orientation="vertical" flexItem />
          <Link
            href="/support"
            variant="body2"
            color="text.secondary"
            underline="hover"
          >
            Support
          </Link>
        </Box>
      </Box>
    </Box>
  );
};

export default Footer;
