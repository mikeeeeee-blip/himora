import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

interface MetricCardProps {
  icon: string;
  title: string;
  value: string;
  trend?: string;
  trendColor?: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
  backgroundImage?: any;
  isSpecialCard?: boolean;
}

export default function MetricCard({
  icon,
  title,
  value,
  trend,
  trendColor = Colors.success,
  subtitle,
  actionButton,
  backgroundImage,
  isSpecialCard = false,
}: MetricCardProps) {
  // Special card variant (for Payout card with image background)
  if (isSpecialCard) {
    return (
      <View style={styles.specialCard}>
        <View style={styles.specialCardOverlay} />
        <View style={styles.specialCardContent}>
          <View style={styles.specialCardLeft}>
            <Text style={styles.specialCardValue}>{value}</Text>
            <Text style={styles.specialCardTitle}>{title}</Text>
            {subtitle && <Text style={styles.specialCardSubtitle}>{subtitle}</Text>}
          </View>
          {actionButton && (
            <View style={styles.specialCardRight}>{actionButton}</View>
          )}
        </View>
      </View>
    );
  }

  // Regular card variant
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name={icon as any} size={20} color={Colors.textMutedLight} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardValue}>{value}</Text>
            {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
          </View>
        </View>
      </View>
      {trend && (
        <View style={styles.trendContainer}>
          <Ionicons
            name={trendColor === Colors.success ? 'trending-up' : 'trending-down'}
            size={14}
            color={trendColor}
          />
          <Text style={[styles.trendText, { color: trendColor }]}>{trend}</Text>
        </View>
      )}
      {actionButton && <View style={styles.actionContainer}>{actionButton}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 12,
    color: Colors.textSubtleLight,
    fontWeight: '500',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textLight,
    minHeight: 28, // Ensure numbers are always visible
    lineHeight: 28,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.textSubtleLight,
    marginTop: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  trendText: {
    fontSize: 12,
  },
  actionContainer: {
    marginTop: 8,
  },
  specialCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
    minHeight: 100,
    backgroundColor: Colors.success,
    position: 'relative',
  },
  specialCardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(34, 197, 94, 0.7)',
  },
  specialCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    height: '100%',
  },
  specialCardLeft: {
    flex: 1,
  },
  specialCardValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.textLight,
    marginBottom: 4,
  },
  specialCardTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textLight,
    marginBottom: 2,
  },
  specialCardSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  specialCardRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

