import { memo } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { goBack } from "../utils/navigation";

type IProps = {
    Title: string,
    onBackPress?: () => void,
    IsHideBack?: boolean,
    rightElement?: any,
    onRightPress?: () => void,
    backgroundColor?: string,
    backgroundColorContent?: string,
    borderBottomWidth?: number,
    buttonRightText?: string;
    isRightTextNoti?: boolean
}
const ToolBar = memo((props: IProps) => {
    const insets = useSafeAreaInsets();
    const hasRightButtonText = props.buttonRightText ? true : false;

    const onBackPress = () => {
        props.onBackPress ? props.onBackPress() : goBack();
    }

    const onRightPress = () => {
        props.onRightPress && props.onRightPress()
    }

    return (
        <View style={{ elevation: 10, zIndex: 10 }} >
            <View style={{ backgroundColor: props.backgroundColor || "white" }}>
                <View style={{ height: insets.top }} />
                <View style={//styles.shadow1, styles.shadow2,
                    {
                        flexDirection: "row", height: 48,// marginTop: insets.top,
                        backgroundColor: props.backgroundColorContent || "white",
                        borderBottomWidth: props.borderBottomWidth !== undefined ? props.borderBottomWidth : 2,
                        borderColor: "rgba(0,0,0,0.07)"
                    }}>
                    {!props.IsHideBack &&
                        <TouchableOpacity onPress={onBackPress}
                            style={{ height: 48, width: 48, justifyContent: "center", alignItems: "center" }}>
                            <View style={{ width: 28, height: 28, borderRadius: 12, backgroundColor: "#F6F6F6", justifyContent: "center", alignItems: "center" }}>
                                {/* <Image source={require("imgs/v2/toolbar/left_icon.webp")}
                                    style={{ width: 20, height: 20 }}
                                    resizeMode="contain"
                                    tintColor="black" /> */}
                            </View>
                        </TouchableOpacity>}
                    <View style={{ flex: 1, justifyContent: "center", paddingLeft: props.IsHideBack ? 16 : 0 }}>
                        <Text style={{ fontSize: 18, color: "#34404B", fontWeight: "700" }}>{props.Title}</Text>
                    </View>
                    {props.rightElement &&
                        <TouchableOpacity
                            onPress={onRightPress}
                            style={{ height: 48, width: 48, justifyContent: "center", alignItems: "center" }}>
                            <Image source={props.rightElement}
                                style={{ width: 24, height: 24, }}
                                resizeMode="contain"
                                tintColor="black" />
                        </TouchableOpacity>}
                    {hasRightButtonText && !props.isRightTextNoti &&
                        <TouchableOpacity
                            onPress={onRightPress}
                            style={{ height: 48, justifyContent: "center", alignItems: "center", paddingRight: 16 }}>
                            <Text style={{ fontSize: 14, fontWeight: "500", color: "#2664ED" }}>{props.buttonRightText}</Text>
                        </TouchableOpacity>}
                </View>
            </View>
        </View>);
})

export default ToolBar;