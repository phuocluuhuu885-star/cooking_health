import React, { memo, useCallback } from 'react';
import type { MealPlanDestination } from '../../utils/types';
import HouseholdScopeSwitch from './HouseholdScopeSwitch';

type MealPlanDestinationSelectorProps = {
  selectedDestination: MealPlanDestination;
  householdAvailable: boolean;
  disabled?: boolean;
  onSelect: (destination: MealPlanDestination) => void;
};

const MealPlanDestinationSelector = memo(
  ({
    selectedDestination,
    householdAvailable,
    disabled = false,
    onSelect,
  }: MealPlanDestinationSelectorProps) => {
    const toggleDestination = useCallback(() => {
      onSelect(selectedDestination === 'PERSONAL' ? 'HOUSEHOLD' : 'PERSONAL');
    }, [onSelect, selectedDestination]);

    return (
      <HouseholdScopeSwitch
        enabled={selectedDestination === 'HOUSEHOLD'}
        householdAvailable={householdAvailable}
        personalLabel="Thêm vào thực đơn cá nhân"
        householdLabel="Đề xuất cho gia đình"
        description={
          selectedDestination === 'HOUSEHOLD'
            ? 'Món sẽ được gửi để các thành viên gia đình bình chọn.'
            : 'Bật để chuyển món sang thực đơn gia đình.'
        }
        disabled={disabled}
        onToggle={toggleDestination}
      />
    );
  },
);

export default MealPlanDestinationSelector;
