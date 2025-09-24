import { useEffect, useState } from 'react';

interface UseAnimatedNumberOptions {
  duration?: number; // Animation duration in milliseconds
  delay?: number; // Delay before starting animation
}

export const useAnimatedNumber = (
  targetValue: number,
  options: UseAnimatedNumberOptions = {}
): number => {
  const { duration = 1500, delay = 0 } = options;
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    if (targetValue === 0) {
      setCurrentValue(0);
      return;
    }

    const startTime = Date.now() + delay;
    let animationFrame: number;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;

      if (elapsed < 0) {
        // Still in delay period
        animationFrame = requestAnimationFrame(animate);
        return;
      }

      if (elapsed >= duration) {
        // Animation complete
        setCurrentValue(targetValue);
        return;
      }

      // Calculate progress using easeOutCubic for smooth animation
      const progress = elapsed / duration;
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);

      const value = Math.floor(easeOutCubic * targetValue);
      setCurrentValue(value);

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [targetValue, duration, delay]);

  return currentValue;
};
