import React, { useRef } from 'react';
import { PanResponder, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

interface SwipeGestureHandlerProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  swipeThreshold?: number;
  disabled?: boolean;
}

export default function SwipeGestureHandler({
  children,
  onSwipeLeft,
  onSwipeRight,
  swipeThreshold = 100,
  disabled = false,
}: SwipeGestureHandlerProps) {
  const router = useRouter();
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (disabled) return;

        const { dx, vx } = gestureState;
        const swipeDistance = Math.abs(dx);
        const swipeVelocity = Math.abs(vx);

        // Check if swipe is significant enough
        if (swipeDistance > swipeThreshold || swipeVelocity > 0.5) {
          if (dx > 0) {
            // Swipe right
            if (onSwipeRight) {
              onSwipeRight();
            } else {
              // Default: navigate to payouts
              router.push('/(superadmin)/payouts');
            }
          } else {
            // Swipe left
            if (onSwipeLeft) {
              onSwipeLeft();
            } else {
              // Default: open notifications (would need to be passed from parent)
              // For now, we'll just call the callback if provided
            }
          }
        }
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

