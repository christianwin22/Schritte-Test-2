import React from 'react';

interface OrientationGuardProps {
  appLanguage?: string;
}

export const OrientationGuard: React.FC<OrientationGuardProps> = () => {
  // Disabled orientation guard to allow seamless usage across all device orientations and split-screens
  return null;
};

