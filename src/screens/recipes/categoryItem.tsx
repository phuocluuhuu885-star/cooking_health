import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { CategoryItemProps } from '../../utils/types';

const CategoryItem = memo(({ item, selected, onPress }: CategoryItemProps) => {
  const handlePress = useCallback(() => {
    onPress(item.id);
  }, [item.id, onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={handlePress}
      style={styles.categoryItem}
    >
      <LinearGradient
        colors={selected ? ['#168653', '#0F7447'] : ['#FFFFFF', '#F2F8F4']}
        style={[
          styles.categoryGradient,
          selected && styles.categoryGradientSelected,
        ]}
      >
        <Text
          style={[styles.categoryText, selected && styles.categoryTextSelected]}
        >
          {item.title}
        </Text>
      </LinearGradient>
    </Pressable>
  );
});

export default CategoryItem;

const styles = StyleSheet.create({
  categoryItem: {
    minHeight: 40,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  categoryGradient: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E4EBE6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryGradientSelected: {
  },

  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#56665E',
  },

  categoryTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
