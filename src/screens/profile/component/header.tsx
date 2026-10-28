import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import Text from '../../../abase/component/text';
import { memo, useCallback } from 'react';
import { selectUserInfo } from '../../../reduxs/reduces/user';
import { useSelector } from 'react-redux';
import { colors } from '../../../abase/constant';
import { launchImageLibrary } from 'react-native-image-picker';
import { getAvatarUri } from '../../../utils/avatarImageUtils';

const ProfileHeader = memo(() => {
  const users = useSelector(selectUserInfo);

  const onChangeAvatar = useCallback(async () => {
    console.log('cdcdcd');

    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 0.8,
    });

    if (result.didCancel) {
      return;
    }

    if (result.errorCode) {
      console.log('Image Picker Error:', result.errorMessage);
      return;
    }

    const image = result.assets?.[0];

    if (!image?.uri) {
      return;
    }

    console.log('Selected image:', image);
  }, []);

  return (
    <View style={styles.profileHeader}>
      <TouchableOpacity style={styles.avatarWrapper} onPress={onChangeAvatar}>
        <Image
          source={{ uri: getAvatarUri(users?.avatar) }}
          style={styles.avatar}
          resizeMode="contain"
        />
        <TouchableOpacity style={styles.cameraButton} onPress={onChangeAvatar}>
          <Text style={styles.cameraText}>▣</Text>
        </TouchableOpacity>
      </TouchableOpacity>
      <Text style={styles.profileName}>{users?.fullName}</Text>
      <Text style={styles.profileEmail}>{users?.email}</Text>
    </View>
  );
});

export default ProfileHeader;

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: 'center',
    marginBottom: 22,
  },
  avatarWrapper: {
    width: 76,
    height: 76,
    marginBottom: 10,
    position: 'relative',
  },

  avatar: {
    width: 76,
    height: 76,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },

  cameraButton: {
    position: 'absolute',
    right: -2,
    bottom: 0,

    width: 24,
    height: 24,
    borderRadius: 12,

    backgroundColor: colors.Green.g300,

    borderWidth: 2,
    borderColor: 'white',

    alignItems: 'center',
    justifyContent: 'center',
  },

  cameraText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
  },

  avatarTouchable: {
    position: 'absolute',
    width: 76,
    height: 76,
    alignSelf: 'center',
  },

  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.Gray.g700,
  },

  profileEmail: {
    fontSize: 10.5,
    color: colors.Gray.g500,
  },
});
