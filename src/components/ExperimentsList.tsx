import React from 'react';
import { Select } from 'antd';
import { Experiment } from '../models/Experiment';

const { Option } = Select;

interface ExperimentsMultiSelectProps {
    experiments: Experiment[];
    onSelectionChange: (selectedIds: number[]) => void;
}

const ExperimentsMultiSelect: React.FC<ExperimentsMultiSelectProps> = ({ experiments, onSelectionChange }) => {
    const handleChange = (values: (number | string)[]) => {
        // Convert all selected values to numbers
        const selectedIds = values.map(val => Number(val));
        onSelectionChange(selectedIds);
    };

    return (
        <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Select experiments"
            onChange={handleChange}
        >
            {experiments.map(exp => (
                <Option key={exp["@ref"]} value={exp["@ref"]}>
                    {exp.name}
                </Option>
            ))}
        </Select>
    );
};

export default ExperimentsMultiSelect;