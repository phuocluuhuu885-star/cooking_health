import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { AppImage } from '../../../abase/component';
import apiConst from '../../../abase/constant/apiConst';
import { syncApi } from '../../../utils/syncUtils';
import type {
  HouseholdMealPollOption,
  MealPeriod,
  RecipeDetailResponse,
} from '../../../utils/types';
import { formatEstimatedPrice } from '../../../utils/priceUtils';
import { navigate } from '../../../utils/navigation';
import ScreenKeys from '../../../utils/screenKey';
import { createStateSetter } from '../../../utils/stateUtils';
import { COLORS } from './styles';
import styles from './styles';

type Props = {
  option: HouseholdMealPollOption;
  mealPeriod: MealPeriod;
  voting: boolean;
  pollClosed: boolean;
  onVote: (mealPeriod: MealPeriod, mealId: string, agrees: boolean) => void;
};

const HouseholdMealPollOptionRow = ({
  option,
  mealPeriod,
  voting,
  pollClosed,
  onVote,
}: Props) => {
  const handleAgree = useCallback(() => {
    onVote(mealPeriod, option.mealId, true);
  }, [mealPeriod, onVote, option.mealId]);
  const handleDisagree = useCallback(() => {
    onVote(mealPeriod, option.mealId, false);
  }, [mealPeriod, onVote, option.mealId]);
  const handleOpenRecipe = useCallback(() => {
    navigate(ScreenKeys.RECIPE_DETAIL, { mealId: option.mealId });
  }, [option.mealId]);
  const [state, setState] = useState({
    mealDescription: option.meal.description?.trim() ?? '',
  });
  const { mealDescription } = state;
  const setMealDescription = useMemo(
    () => createStateSetter(setState, 'mealDescription'),
    [setState],
  );

  useEffect(() => {
    const existingDescription = option.meal.description?.trim();
    if (existingDescription) {
      setMealDescription(existingDescription);
      return;
    }
    let isCurrentRequest = true;
    syncApi(apiConst.getMealDetail, {
      id: option.mealId,
      servings: 1,
    })
      .then(response => {
        if (!isCurrentRequest) {
          return;
        }
        const mealResponse = response as RecipeDetailResponse;
        setMealDescription(mealResponse?.data?.description?.trim() ?? '');
      })
      .catch(() => {
        if (isCurrentRequest) {
          setMealDescription('');
        }
      });
    return () => {
      isCurrentRequest = false;
    };
  }, [option.meal.description, option.mealId, setMealDescription]);

  const resultLabel =
    option.outcome === 'ACCEPTED'
      ? 'Được giữ trong thực đơn'
      : option.outcome === 'REJECTED'
      ? 'Bị loại khỏi thực đơn'
      : '';

  return (
    <View style={styles.pollOption}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem cách nấu món ${option.meal.name}`}
        onPress={handleOpenRecipe}
        style={styles.pollMealDetails}
      >
        {option.meal.imageUrl ? (
          <AppImage
            source={{ uri: option.meal.imageUrl }}
            style={styles.pollMealImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.pollMealImage, styles.mealImagePlaceholder]}>
            <Text style={styles.memberInitial}>MC</Text>
          </View>
        )}
        <View style={styles.pollMealCopy}>
          <Text numberOfLines={2} style={styles.pollMealName}>
            {option.meal.name}
          </Text>
          <Text numberOfLines={3} style={styles.pollMealDescription}>
            {mealDescription || 'Chưa có mô tả cho món ăn này.'}
          </Text>
          <Text style={styles.recipeLink}>Chạm để xem cách nấu</Text>
          <Text style={styles.mealPrice}>
            {formatEstimatedPrice(option.estimatedPrice)}
          </Text>
        </View>
      </Pressable>
      <Text style={styles.pollCounts}>
        Đồng ý {option.agrees} · Không đồng ý {option.disagrees} · Chưa chọn{' '}
        {option.unvoted}
      </Text>
      {!option.outcome && !pollClosed ? (
        <Text style={styles.myVote}>
          {option.myVote === null
            ? 'Bạn chưa bình chọn món này'
            : `Bạn đã chọn: ${option.myVote ? 'Đồng ý' : 'Không đồng ý'}`}
        </Text>
      ) : null}
      {resultLabel ? (
        <Text
          style={[
            styles.pollResult,
            option.outcome === 'ACCEPTED' && styles.pollAccepted,
          ]}
        >
          {resultLabel}
        </Text>
      ) : !pollClosed ? (
        <View style={styles.voteActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Đồng ý với món ${option.meal.name}`}
            accessibilityState={{ selected: option.myVote === true }}
            disabled={voting}
            onPress={handleAgree}
            style={[
              styles.voteButton,
              option.myVote === true && styles.voteAgreeSelected,
              voting && styles.disabledButton,
            ]}
          >
            <Text style={styles.voteButtonText}>Đồng ý</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Không đồng ý với món ${option.meal.name}`}
            accessibilityState={{ selected: option.myVote === false }}
            disabled={voting}
            onPress={handleDisagree}
            style={[
              styles.voteButton,
              option.myVote === false && styles.voteDisagreeSelected,
              voting && styles.disabledButton,
            ]}
          >
            <Text style={styles.voteButtonText}>Không đồng ý</Text>
          </Pressable>
          {voting ? <ActivityIndicator color={COLORS.green} /> : null}
        </View>
      ) : null}
    </View>
  );
};

export default HouseholdMealPollOptionRow;
