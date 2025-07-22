import React from "react";
import { Card, CardContent, Box, Typography } from "@mui/material";

export default function StatCardWithBadge({
  badgeLabel,
  badgeColor,
  title,
  children,
  sx
}) {
  return (
    <Box sx={{ position: "relative", width: "100%", ...sx }}>
      {/* バッジ */}
      <Box
        sx={{
          position: "absolute",
          top: -10,
          left: 22,
          bgcolor: badgeColor,
          color: "#fff",
          borderRadius: 2,
          px: 2.3,
          py: 0.8,
          fontWeight: "bold",
          fontSize: 18,
          boxShadow: 3,
          zIndex: 2,
          minWidth: 100,
          textAlign: "center",
          letterSpacing: 1.2,
          opacity: 0.98
        }}
      >
        {badgeLabel}
      </Box>
      <Card
        sx={{
          minHeight: 115,
          pt: 3,
          pb: 2,
          pl: 2.5,
          pr: 2,
          borderRadius: 3,
          boxShadow: 3,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}
      >
        <CardContent sx={{ pt: 2 }}>
          {title && (
            <Typography
              variant="subtitle2"
              color="text.secondary"
              align="right"
              sx={{ mb: 0.5, fontWeight: 700 }}
            >
              {title}
            </Typography>
          )}
          {children}
        </CardContent>
      </Card>
    </Box>
  );
}
