import { Image, ImageProps } from 'react-native';
import FastImage from '@d11/react-native-fast-image';

interface AppImageProps extends Omit<ImageProps, 'source'> {
    source: any;
    useDefaultImage?: boolean; // Ép buộc dùng Image mặc định của React Native
}

const AppImage = ({ source, useDefaultImage = false, style, ...props }: AppImageProps) => {
    // Trường hợp 1: Nếu dev chủ động ép buộc dùng Image mặc định (Ví dụ: để chạy ảnh GIF hoặc dùng blurRadius)
    if (useDefaultImage) {
        return <Image source={source} style={style} {...props} />;
    }

    // Trường hợp 2: Nếu source là ảnh local (được gọi qua require('./path'))
    if (typeof source === 'number') {
        return (
            <FastImage
                source={source}
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
                uri: source?.uri,
                priority: FastImage.priority.normal,
                cache: FastImage.cacheControl.immutable, // Tối ưu cache cho ảnh online
            }}
            style={style}
            {...(props as any)}
        />
    );
};

export default AppImage;