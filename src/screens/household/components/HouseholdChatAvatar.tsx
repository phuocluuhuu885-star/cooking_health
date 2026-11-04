import React, { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { getAvatarUri } from '../../../utils/avatarImageUtils';
import { getInitials } from '../../../utils/stringUtils';

type Props = {
  avatar: string | null | undefined;
  name: string;
};

const HouseholdChatAvatar = ({ avatar, name }: Props) => {
  const [imageFailed, setImageFailed] = useState(false);
  const uri = getAvatarUri(avatar);
  const handleImageError = useCallback(() => {
    setImageFailed(true);
  }, []);

  return (
    <View style={styles.avatar}>
      {uri && !imageFailed ? (
        <Image
          source={{ uri }}
          style={styles.avatarImage}
          onError={handleImageError}
        />
      ) : (
        <Text style={styles.avatarText}>{getInitials(name) || 'M'}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#E7F4EC',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#168653', fontSize: 11, fontWeight: '800' },
});

export default HouseholdChatAvatar;
