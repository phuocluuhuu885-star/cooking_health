import { getBmiAssessment } from './bmiAssessment';

describe('getBmiAssessment', () => {
  it('does not use adult categories for people under 20', () => {
    expect(getBmiAssessment(19, 21).label).toBe('Cần đánh giá theo tuổi');
  });

  it('uses the adult BMI ranges and category boundaries', () => {
    expect(getBmiAssessment(20, 18.4).tone).toBe('low');
    expect(getBmiAssessment(20, 18.5).tone).toBe('healthy');
    expect(getBmiAssessment(20, 25).tone).toBe('elevated');
    expect(getBmiAssessment(20, 30).label).toBe('BMI thuộc nhóm béo phì độ I');
    expect(getBmiAssessment(20, 35).label).toBe('BMI thuộc nhóm béo phì độ II');
    expect(getBmiAssessment(20, 40).label).toBe('BMI thuộc nhóm béo phì độ III');
  });

  it('returns a neutral result for invalid measurements', () => {
    expect(getBmiAssessment(30, 0).tone).toBe('unknown');
    expect(getBmiAssessment(30, Number.NaN).tone).toBe('unknown');
  });
});
