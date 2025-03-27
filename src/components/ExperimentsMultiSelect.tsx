import React from 'react';
import { Select } from 'antd';
import { Experiment } from '../models/Experiment';

const { Option } = Select;

export interface ExperimentsMultiSelectProps {
    experiments: Experiment[];
    onSelectionChange: (selectedNames: string[]) => void;
}

const ExperimentsMultiSelect: React.FC<ExperimentsMultiSelectProps> = ({ experiments, onSelectionChange }) => {
    const handleChange = (values: string[]) => {
        onSelectionChange(values);
    };

    return (
        <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Select experiments"
            onChange={handleChange}
        >
            {experiments.map((exp, index) => (
                <Option key={`${exp.name}-${index}`} value={exp.name}>
                    {exp.name}
                </Option>
            ))}
        </Select>
    );
};

export default ExperimentsMultiSelect;