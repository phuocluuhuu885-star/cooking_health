import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

const EmptyComponent = memo((props: {
    message: string,
    subTitle?: string
}) => {
    const isSubTitle = props.subTitle && props.subTitle !== "" ? true : false;
    return (
        <View style={styles.viewEmty}>
            {/* <AppImage
                source={require("imgs/v2/ticket/emptybox.webp")}
                style={styles.image}
                resizeMode="contain"
            /> */}
            <View
                style={styles.textView}
            >
                <Text style={styles.textEmty}>{props.message}</Text>
                {isSubTitle && <Text style={styles.textEmtyMessage}>{props.subTitle}</Text>}
            </View>
        </View>
    );
});
export default EmptyComponent;


const styles = StyleSheet.create({
    viewEmty: {
        justifyContent: "center",
        alignItems: "center",
        gap: 24,
        padding: 16,
    },
    image: { width: 181, height: 181 },
    textEmty: {
        fontSize: 16,
        color: "#34404B",
        fontWeight: "700",
        textAlign: "center",
    },
    textView: { gap: 4, justifyContent: "center", alignItems: "center" },
    textEmtyMessage: {
        fontSize: 16,
        color: "#7C8590",
        fontWeight: "400",
        textAlign: "center",
    },
});