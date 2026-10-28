import { memo } from "react";
import { StyleSheet, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Text from "../../../abase/component/text";
import { colors } from "../../../abase/constant";

const StatisticCard = memo(
    ({
      height,
      weight,
      bmi,
      bmiStatus,
      healthyWeightRange,
    }: {
      height: string;
      weight: string;
      bmi: string;
      bmiStatus: string;
      healthyWeightRange: string;
    }) => {
      return (
        <LinearGradient
          colors={['#FFFFFF', '#F3FAF5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statisticsCard}
        >
          <View style={styles.statisticsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>HEIGHT</Text>

              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{height}</Text>
                <Text style={styles.statUnit}>cm</Text>
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>WEIGHT</Text>

              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{weight}</Text>
                <Text style={styles.statUnit}>kg</Text>
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>BMI</Text>

              <Text style={styles.bmiValue}>{bmi}</Text>

              <View style={styles.bmiBadge}>
                <Text style={styles.bmiBadgeText}>{bmiStatus}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.healthyWeight}>
            Healthy weight range: {healthyWeightRange}
          </Text>
        </LinearGradient>
      );
    },
  );
  export default StatisticCard

  const styles = StyleSheet.create({
    statisticsCard: {
        minHeight: 92,
        alignItems: 'stretch',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 8,
        shadowColor: '#000',
        shadowOpacity: 0.035,
        shadowRadius: 8,
        shadowOffset: {
          width: 0,
          height: 2,
        },
        elevation: 1,
    },

    statisticsRow: {
        minHeight: 58,
        flexDirection: 'row',
        alignItems: 'center',
    },
    
      statItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      },
    
      statDivider: {
        width: StyleSheet.hairlineWidth,
        height: 58,
      },
    
      statLabel: {
        fontSize: 14,
        fontWeight: '400',
        color: colors.Gray.g400,
        marginBottom: 5,
      },
    
      statValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
      },
    
      statValue: {
        fontSize: 25,
        lineHeight: 30,
        fontWeight: '800',
        color: colors.Gray.g400,
      },
    
      statUnit: {
        marginLeft: 3,
        fontSize: 9,
        color:colors.Gray.g300,
      },
    
      bmiValue: {
        fontSize: 25,
        lineHeight: 30,
        fontWeight: '800',
        color: colors.Gray.g300,
      },
    
      bmiBadge: {
        marginTop: 3,
        paddingHorizontal: 7,
        paddingVertical: 2,
    
        borderRadius: 12,
        backgroundColor: colors.Green.g400,
      },
    
      bmiBadgeText: {
        fontSize: 7,
        lineHeight: 10,
        fontWeight: '700',
        color: colors.Green.g400,
      },
      healthyWeight: {
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.Gray.g200,
        textAlign: 'center',
        color: colors.Gray.g500,
        fontSize: 14,
      },
  })