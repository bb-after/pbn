import React from 'react';
import { Typography, TypographyProps } from '@mui/material';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

interface AnimatedNumberProps extends Omit<TypographyProps, 'children'> {
  value: number;
  duration?: number;
  delay?: number;
  formatNumber?: boolean;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 1500,
  delay = 0,
  formatNumber = true,
  ...typographyProps
}) => {
  const animatedValue = useAnimatedNumber(value, { duration, delay });

  const displayValue = formatNumber ? animatedValue.toLocaleString() : animatedValue.toString();

  return <Typography {...typographyProps}>{displayValue}</Typography>;
};

export default AnimatedNumber;
