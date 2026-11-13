export type BmiAssessmentTone =
  | 'low'
  | 'healthy'
  | 'elevated'
  | 'obesity'
  | 'unknown';

export type BmiAssessment = {
  label: string;
  range: string;
  tone: BmiAssessmentTone;
};

export const getBmiAssessment = (age: number, bmi: number): BmiAssessment => {
  if (!Number.isFinite(bmi) || bmi <= 0) {
    return {
      label: 'Chưa đủ dữ liệu đánh giá',
      range: 'Kiểm tra lại chiều cao và cân nặng trong hồ sơ sức khỏe.',
      tone: 'unknown',
    };
  }

  if (!Number.isFinite(age) || age < 20) {
    return {
      label: 'Cần đánh giá theo tuổi',
      range:
        'Người dưới 20 tuổi cần đối chiếu BMI theo tuổi và giới tính; ứng dụng chưa có biểu đồ tăng trưởng để xếp loại.',
      tone: 'unknown',
    };
  }

  if (bmi < 18.5) {
    return {
      label: 'BMI thấp hơn ngưỡng tham khảo',
      range: 'Phân loại người trưởng thành: BMI dưới 18,5.',
      tone: 'low',
    };
  }

  if (bmi < 25) {
    return {
      label: 'Trong khoảng BMI tham khảo',
      range: 'Phân loại người trưởng thành: BMI từ 18,5 đến dưới 25.',
      tone: 'healthy',
    };
  }

  if (bmi < 30) {
    return {
      label: 'BMI cao hơn ngưỡng tham khảo',
      range: 'Phân loại người trưởng thành: BMI từ 25 đến dưới 30.',
      tone: 'elevated',
    };
  }

  if (bmi < 35) {
    return {
      label: 'BMI thuộc nhóm béo phì độ I',
      range: 'Phân loại người trưởng thành: BMI từ 30 đến dưới 35.',
      tone: 'obesity',
    };
  }

  if (bmi < 40) {
    return {
      label: 'BMI thuộc nhóm béo phì độ II',
      range: 'Phân loại người trưởng thành: BMI từ 35 đến dưới 40.',
      tone: 'obesity',
    };
  }

  return {
    label: 'BMI thuộc nhóm béo phì độ III',
    range: 'Phân loại người trưởng thành: BMI từ 40 trở lên.',
    tone: 'obesity',
  };
};
