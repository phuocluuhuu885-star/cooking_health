import React, { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { HouseholdMember } from '../../../utils/types';
import styles from './styles';

type Props = {
  member: HouseholdMember;
  canRemove: boolean;
  onRemove: (memberId: string, memberName: string) => void;
};

const HouseholdMemberRow = ({ member, canRemove, onRemove }: Props) => {
  const handleRemove = useCallback(() => {
    onRemove(member.userId, member.user.fullName || member.user.email);
  }, [member, onRemove]);

  return (
    <View style={styles.memberRow}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberInitial}>
          {(member.user.fullName || member.user.email)
            .trim()
            .charAt(0)
            .toLocaleUpperCase()}
        </Text>
      </View>
      <View style={styles.memberDetails}>
        <Text style={styles.memberName}>
          {member.user.fullName?.trim() || member.user.email}
        </Text>
        <Text style={styles.memberRole}>
          {member.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
        </Text>
      </View>
      {canRemove ? (
        <Pressable accessibilityRole="button" onPress={handleRemove}>
          <Text style={styles.removeText}>Xóa</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

export default HouseholdMemberRow;
