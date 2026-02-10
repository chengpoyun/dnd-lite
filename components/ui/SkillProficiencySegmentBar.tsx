import React from 'react';
import { SegmentBar, type SegmentBarOption } from './SegmentBar';

export type SkillProficiencyLevel = 0 | 1 | 2;

interface SkillProficiencySegmentBarProps {
  value: SkillProficiencyLevel;
  onChange: (value: SkillProficiencyLevel) => void;
  className?: string;
}

const options: SegmentBarOption<SkillProficiencyLevel>[] = [
  { value: 0, label: '無' },
  { value: 1, label: '熟練' },
  { value: 2, label: '專精' },
];

export const SkillProficiencySegmentBar: React.FC<SkillProficiencySegmentBarProps> = ({
  value,
  onChange,
  className = '',
}) => {
  return (
    <div className={className}>
      <SegmentBar<SkillProficiencyLevel>
        options={options}
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

