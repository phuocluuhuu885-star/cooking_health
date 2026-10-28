import { memo, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppImage } from '../../abase/component';
import type { RecipeCardProps } from '../../utils/types';

const ItemProduct = memo(
  ({
    item,
    width,
    isFavorite,
    onFavorite,
    onAdd,
    onPress,
    reviewSummary,
  }: RecipeCardProps) => {
    const handleFavorite = useCallback(() => {
      onFavorite(item.id);
    }, [item.id, onFavorite]);

    const handleAdd = useCallback(() => {
      onAdd(item.id);
    }, [item.id, onAdd]);

    const handlePress = useCallback(() => {
      onPress(item.id);
    }, [item.id, onPress]);

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem công thức ${item.name}`}
        style={[styles.recipeCard, { width }]}
        onPress={handlePress}
      >
        <View style={styles.imageContainer}>
          {item.image ? (
            <AppImage
              source={{ uri: item.image }}
              style={styles.recipeImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.recipeImage, styles.imagePlaceholder]}>
              <Text style={styles.placeholderText}>MealCraft</Text>
            </View>
          )}
          <View style={styles.timeBadge}>
            <Text style={styles.timeBadgeText}>{item.time} phút</Text>
          </View>
          <TouchableOpacity
            hitSlop={8}
            onPress={event => {
              event.stopPropagation();
              handleFavorite();
            }}
            style={[styles.favoriteButton, isFavorite && styles.favoriteActive]}
            accessibilityRole="button"
            accessibilityLabel={
              isFavorite ? 'Bỏ khỏi món yêu thích' : 'Thêm vào món yêu thích'
            }
          >
            <Text
              style={[
                styles.favoriteText,
                isFavorite && styles.favoriteTextActive,
              ]}
            >
              {isFavorite ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={['#FFFFFF', '#F2F8F4']}
          style={styles.recipeContent}
        >
          <Text numberOfLines={2} style={styles.recipeName}>
            {item.name}
          </Text>
          <Text style={styles.calories}>
            {item.nutritionAvailable === false
              ? 'Chưa có calo'
              : `${Math.round(item.calories)} kcal`}
          </Text>
          {item.nutritionAvailable !== false ? (
            <Text numberOfLines={1} style={styles.macroText}>
              Đạm {Math.round(item.protein)}g · Carb {Math.round(item.carbs)}g
            </Text>
          ) : null}
          <View style={styles.cardBottom}>
            <View
              accessible
              accessibilityLabel={
                reviewSummary?.total
                  ? `Đánh giá ${reviewSummary.averageRating.toFixed(1)} trên 5 sao`
                  : 'Chưa có đánh giá'
              }
              style={styles.ratingSummary}
            >
              <Text style={styles.ratingStar}>★</Text>
              <Text style={styles.ratingValue}>
                {reviewSummary?.total
                  ? reviewSummary.averageRating.toFixed(1)
                  : '—'}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Thêm ${item.name} vào thực đơn`}
              onPress={event => {
                event.stopPropagation();
                handleAdd();
              }}
              style={styles.addButton}
            >
              <Text style={styles.addText}>＋</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Pressable>
    );
  },
);

export default ItemProduct;

const styles = StyleSheet.create({
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8EEE9',
    shadowColor: '#193A2A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  imageContainer: {
    width: 104,
    height: 112,
    backgroundColor: '#EAF3ED',
    position: 'relative',
  },
  recipeImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#168653',
    fontSize: 12,
    fontWeight: '800',
  },
  timeBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(23, 43, 35, 0.82)',
  },
  timeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  favoriteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
  },
  favoriteActive: {
    backgroundColor: '#FFF0EF',
  },
  favoriteText: {
    color: '#56665E',
    fontSize: 16,
    lineHeight: 20,
  },
  favoriteTextActive: {
    color: '#E45D57',
  },
  recipeContent: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  recipeName: {
    color: '#172B23',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  calories: {
    marginTop: 6,
    color: '#168653',
    fontSize: 12,
    fontWeight: '800',
  },
  macroText: {
    marginTop: 3,
    color: '#718078',
    fontSize: 10,
    fontWeight: '600',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingStar: {
    color: '#E89B36',
    fontSize: 16,
  },
  ratingValue: {
    color: '#172B23',
    fontSize: 12,
    fontWeight: '800',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#168653',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '500',
  },
});
