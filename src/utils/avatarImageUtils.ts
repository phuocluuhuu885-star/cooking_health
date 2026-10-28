import { launchImageLibrary } from 'react-native-image-picker';
import configs from '../abase/constant/config';

const MAX_AVATAR_BYTES = 512 * 1024;

export const pickCompressedAvatar = async (): Promise<string | null> => {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.7,
    includeBase64: true,
    assetRepresentationMode: 'compatible',
  });

  if (result.didCancel) return null;
  if (result.errorCode) {
    throw new Error(result.errorMessage || 'Không thể mở thư viện ảnh.');
  }

  const asset = result.assets?.[0];
  if (!asset?.base64) {
    throw new Error('Không đọc được ảnh đã chọn. Vui lòng chọn ảnh khác.');
  }

  const padding = asset.base64.endsWith('==')
    ? 2
    : asset.base64.endsWith('=')
    ? 1
    : 0;
  const sizeBytes = Math.floor((asset.base64.length * 3) / 4) - padding;
  if (sizeBytes > MAX_AVATAR_BYTES) {
    throw new Error('Ảnh sau khi nén vẫn vượt quá 512 KB. Hãy chọn ảnh khác.');
  }
  return asset.base64;
};

export const getAvatarUri = (avatar: string | null | undefined) => {
  if (!avatar) return undefined;
  if (/^https?:\/\//i.test(avatar)) return avatar;
  return new URL(avatar.replace(/^\/+/, ''), configs.baseUrl).toString();
};
