import { Image, ImageProps } from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import { useSelector } from 'react-redux';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { getBaseUrl } from '../../utils/syncUtils';

interface AppImageProps extends Omit<ImageProps, 'source'> {
    source: any;
    useDefaultImage?: boolean; // Ép buộc dùng Image mặc định của React Native
}

const AppImage = ({ source, useDefaultImage = false, style, ...props }: AppImageProps) => {
    const user = useSelector(selectUserInfo);
    const imageSource = getImageSource(source, user?.accessToken);

    // Trường hợp 1: Nếu dev chủ động ép buộc dùng Image mặc định (Ví dụ: để chạy ảnh GIF hoặc dùng blurRadius)
    if (useDefaultImage) {
        return <Image source={imageSource} style={style} {...props} />;
    }

    // Trường hợp 2: Nếu source là ảnh local (được gọi qua require('./path'))
    if (typeof imageSource === 'number') {
        return (
            <FastImage
                source={imageSource}
                style={style}
                resizeMode={FastImage.resizeMode.contain} // Hoặc map từ props.resizeMode sang
                {...(props as any)}
            />
        );
    }

    // Trường hợp 3: Đối với ảnh URL online ({ uri: 'https://...' })
    return (
        <FastImage
            source={{
                ...imageSource,
                priority: FastImage.priority.normal,
                cache: FastImage.cacheControl.immutable, // Tối ưu cache cho ảnh online
            }}
            style={style}
            {...(props as any)}
        />
    );
};

const getImageSource = (source: any, accessToken?: string) => {
    if (typeof source !== 'object' || typeof source?.uri !== 'string') {
        return source;
    }

    const isCommunityMealImage = source.uri.includes('/api/community-meals/');
    const uri = source.uri.startsWith('/')
        ? `${getBaseUrl().replace(/\/+$/, '')}${source.uri}`
        : source.uri;
    const headers = { ...source.headers };
    if (isCommunityMealImage && accessToken && !headers.Authorization) {
        headers.Authorization = `Bearer ${accessToken}`;
    }

    return {
        ...source,
        uri,
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
    };
};

export default AppImage;