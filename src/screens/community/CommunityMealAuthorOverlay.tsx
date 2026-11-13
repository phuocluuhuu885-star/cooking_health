import React, { memo, useCallback } from 'react';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type CommunityMealAuthorOverlayProps = {
  creatorId: string;
  name: string;
  avatarUrl: string | null;
  onPress?: (creatorId: string) => void;
};

const CommunityMealAuthorOverlay = memo(
  ({
    creatorId,
    name,
    avatarUrl,
    onPress,
  }: CommunityMealAuthorOverlayProps) => {
    const handlePress = useCallback(() => {
      onPress?.(creatorId);
    }, [creatorId, onPress]);

    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Xem các món ${name} đã chia sẻ`}
        disabled={!onPress}
        onPress={handlePress}
        style={styles.container}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.initial}>
              {name.trim().charAt(0).toLocaleUpperCase() || 'M'}
            </Text>
          </View>
        )}
        <Text numberOfLines={1} style={styles.name}>
          {name}
        </Text>
      </TouchableOpacity>
    );
  },
);

export default CommunityMealAuthorOverlay;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 12,
    left: 12,
    maxWidth: '84%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(20, 35, 27, 0.76)',
    zIndex: 2,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DDEBE0',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#168653',
    fontSize: 14,
    fontWeight: '800',
  },
  name: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
