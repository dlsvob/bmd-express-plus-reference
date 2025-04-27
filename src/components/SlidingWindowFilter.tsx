// src/components/SlidingWindowFilter.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, InputNumber, Space } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import './SlidingWindow.css'; // Make sure this CSS file exists

const { Text } = Typography;

interface SlidingWindowFilterProps {
    min: number; // The absolute minimum possible rank (usually 1)
    max: number; // The absolute maximum possible rank (N)
    value: [number, number]; // The currently committed range [start, end] from Redux
    onAfterChange?: (value: [number, number]) => void; // Callback when range changes
    disabled?: boolean;
    label?: string;
    analysisName?: string; // For logging context
}

const SlidingWindowFilter: React.FC<SlidingWindowFilterProps> = React.memo(
    ({
        min,
        max,
        value, // This is the committed value from Redux
        onAfterChange,
        disabled = false,
        label = 'Filter by Rank',
        analysisName = 'SlidingWindowFilter',
    }) => {
        const logPrefix = `[${analysisName}]`;

        // Internal state for the displayed range in the UI
        const [displayValue, setDisplayValue] = useState<[number, number]>([1, 1]);
        // Internal state for the width input field (string to allow intermediate typing)
        const [widthInput, setWidthInput] = useState<string>('1');

        // --- REVISED useEffect (v6) for Initialization and Syncing ---
        useEffect(() => {
            console.log(
                `${logPrefix} useEffect Sync Check. Props: min=${min}, max=${max}, value=[${value?.join(
                    ', '
                )}]. Current display: [${displayValue.join(', ')}]`
            );

            // Determine if the incoming min/max props represent a valid range
            // A valid range requires min < max and both are finite numbers.
            const isPropsRangeValid =
                typeof min === 'number' &&
                typeof max === 'number' &&
                isFinite(min) &&
                isFinite(max) &&
                min < max; // Strictly less than for a valid range > 1 point

            let newDisplayValue: [number, number];
            let newWidth: number;

            if (isPropsRangeValid) {
                // The incoming min/max define a valid range (more than one possible point)
                console.log(`${logPrefix} useEffect: Valid props range [${min}, ${max}] received.`);

                // Use the committed value from props, but clamp it strictly within the valid [min, max] bounds.
                // This ensures the display never shows values outside the possible range.
                const clampedStart = Math.max(min, Math.min(value[0], max));
                // Ensure end is >= start and <= max
                const clampedEnd = Math.min(max, Math.max(clampedStart, value[1]));

                newDisplayValue = [clampedStart, clampedEnd];
                newWidth = newDisplayValue[1] - newDisplayValue[0] + 1;

                console.log(
                    `${logPrefix} useEffect: Calculated target display: [${newDisplayValue.join(
                        ', '
                    )}], width: ${newWidth}`
                );

                // --- Force state update ---
                // Always update the state if the props define a valid range.
                // This ensures synchronization even if the calculated newDisplayValue happens
                // to be the same as the current displayValue (e.g., after reset).
                setDisplayValue(newDisplayValue);
                setWidthInput(String(newWidth));
                console.log(
                    `${logPrefix} useEffect: State updated to: [${newDisplayValue.join(
                        ', '
                    )}]`
                );
                // -------------------------
            } else {
                // The incoming min/max props are invalid (e.g., loading, no data max=0, min >= max)
                // Default to a safe placeholder state [1, 1] and width 1.
                // Use Math.max(1, min) in case min itself is invalid initially.
                const safeMin = Math.max(1, min);
                newDisplayValue = [safeMin, safeMin];
                newWidth = 1;
                console.log(
                    `${logPrefix} useEffect: Invalid props range [${min}, ${max}]. Setting display to placeholder: [${newDisplayValue.join(
                        ', '
                    )}]`
                );

                // Update state only if it's different from the placeholder to avoid loops
                if (
                    displayValue[0] !== newDisplayValue[0] ||
                    displayValue[1] !== newDisplayValue[1]
                ) {
                    setDisplayValue(newDisplayValue);
                    setWidthInput(String(newWidth));
                }
            }
            // This effect depends on the external props that define the range and the committed value.
        }, [value, min, max]); // Dependencies remain the same
        // --- END REVISED useEffect ---

        // --- Width Input Handling ---
        const finalizeWidthInput = useCallback(() => {
            const currentSafeMax = Math.max(1, max); // Use max from props
            if (disabled || currentSafeMax < min) return; // Check against props min/max

            const parsedWidth = parseInt(widthInput, 10);
            let newWidth: number;

            // Validate parsed width and clamp it between 1 and the total range size
            if (!isNaN(parsedWidth) && parsedWidth > 0) {
                newWidth = Math.max(1, Math.min(parsedWidth, currentSafeMax - min + 1));
            } else {
                // If input is invalid, revert to the width derived from the current displayValue
                newWidth = displayValue[1] - displayValue[0] + 1;
                setWidthInput(String(newWidth)); // Update input to show the reverted width
                return; // Don't proceed further if input was invalid
            }

            // Apply the new width, starting from rank 1
            const newStart = min; // Always start from the minimum possible rank (prop)
            const newEnd = Math.min(currentSafeMax, newStart + newWidth - 1);
            const finalRange: [number, number] = [newStart, newEnd];

            console.log(
                `${logPrefix} finalizeWidthInput: Parsed=${parsedWidth}, Clamped Width=${newWidth}, Final Range=[${finalRange.join(
                    ', '
                )}]`
            );

            // Update local state *before* calling onAfterChange
            setDisplayValue(finalRange);
            setWidthInput(String(finalRange[1] - finalRange[0] + 1)); // Update width input based on final range

            // Trigger the callback to update Redux state
            if (onAfterChange) {
                onAfterChange(finalRange);
            }
        }, [
            widthInput,
            displayValue,
            min,
            max,
            onAfterChange,
            disabled,
            logPrefix,
        ]);

        // --- Sliding Window Handler ---
        const handleShift = useCallback(
            (amount: number) => {
                const currentSafeMax = Math.max(1, max); // Use max from props
                if (disabled || currentSafeMax < min || amount === 0) return; // Check against props min/max

                const currentStart = displayValue[0];
                const currentEnd = displayValue[1];
                const currentWidth = currentEnd - currentStart + 1;

                // Calculate desired start, clamping within valid bounds [min, max - width + 1]
                let desiredStart = currentStart + amount;
                desiredStart = Math.max(
                    min,
                    Math.min(desiredStart, currentSafeMax - currentWidth + 1)
                );

                // Calculate desired end based on the clamped start and width
                let desiredEnd = Math.min(currentSafeMax, desiredStart + currentWidth - 1);

                const finalRange: [number, number] = [desiredStart, desiredEnd];

                // Only update if the range actually changed
                if (finalRange[0] !== currentStart || finalRange[1] !== currentEnd) {
                    console.log(
                        `${logPrefix} handleShift(${amount}): New Range=[${finalRange.join(
                            ', '
                        )}]`
                    );
                    // Update local state *before* calling onAfterChange
                    setDisplayValue(finalRange);
                    setWidthInput(String(finalRange[1] - finalRange[0] + 1)); // Update width input

                    // Trigger the callback to update Redux state
                    if (onAfterChange) {
                        onAfterChange(finalRange);
                    }
                } else {
                    console.log(`${logPrefix} handleShift(${amount}): No change.`);
                }
            },
            [min, max, displayValue, onAfterChange, disabled, logPrefix]
        );

        // --- Reset Handler ---
        const handleReset = useCallback(() => {
            if (disabled) return;
            const currentSafeMax = Math.max(1, max); // Use max from props
            // Reset to the full valid range defined by props
            const fullRange: [number, number] = [min, currentSafeMax];

            console.log(
                `${logPrefix} handleReset: Resetting to full range [${fullRange.join(
                    ', '
                )}]`
            );

            // Update local state *before* calling onAfterChange
            setDisplayValue(fullRange);
            setWidthInput(String(fullRange[1] - fullRange[0] + 1)); // Update width input

            // Trigger the callback to update Redux state
            if (onAfterChange) {
                onAfterChange(fullRange);
            }
        }, [disabled, min, max, onAfterChange, logPrefix]);

        // Determine button disabled states based on *displayValue* and props *min/max*
        const canShiftDown = !disabled && displayValue[0] > min;
        const canShiftUp = !disabled && displayValue[1] < max;
        const isRangeValidForControls = max > min; // Controls only make sense if there's a range

        const shiftAmounts = [-100, -10, -1, +1, +10, +100];

        // --- JSX Rendering ---
        return (
            <div
                style={{
                    padding: '10px 15px',
                    border: '1px solid #f0f0f0',
                    borderRadius: '4px',
                    background: '#fafafa',
                    marginBottom: '1rem',
                }}
            >
                <div style={{ padding: '5px 0' }}>
                    <Space align="center" wrap>
                        <Text style={{ whiteSpace: 'nowrap' }}>{label}:</Text>
                        {/* Display the internal displayValue state */}
                        <Text code>{`[${displayValue[0]} - ${displayValue[1]}]`}</Text>
                        <Text type="secondary" style={{ marginLeft: '10px' }}>
                            (Total Points: {max > 0 ? max : 0}) {/* Show 0 if max is invalid */}
                        </Text>
                        <Space.Compact style={{ marginLeft: '10px' }}>
                            {shiftAmounts.map((amount) => (
                                <Button
                                    key={amount}
                                    size="small"
                                    onClick={() => handleShift(amount)}
                                    // Disable based on calculated ability to shift and overall validity
                                    disabled={
                                        disabled ||
                                        !isRangeValidForControls ||
                                        (amount < 0 ? !canShiftDown : !canShiftUp)
                                    }
                                    aria-label={`Shift range by ${amount}`}
                                >
                                    {amount > 0 ? `+${amount}` : amount}
                                </Button>
                            ))}
                        </Space.Compact>
                        <Text style={{ marginLeft: '10px' }}>Width:</Text>
                        <InputNumber
                            aria-label="Range Width"
                            className="sliding-window-width-input" // Keep custom class if needed
                            size="small"
                            min={1}
                            // Max width is the total number of points in the valid range
                            max={max > min ? max - min + 1 : 1}
                            step={1}
                            // Use the string state for the input value
                            value={widthInput ? parseInt(widthInput, 10) : undefined} // Parse for display, handle empty string
                            // Update the string state on change
                            onChange={(val) => setWidthInput(val === null ? '' : String(val))}
                            onBlur={finalizeWidthInput} // Finalize on blur
                            onPressEnter={(e) => {
                                e.preventDefault();
                                finalizeWidthInput();
                            }} // Finalize on Enter
                            disabled={disabled || !isRangeValidForControls} // Disable if range is invalid
                            style={{ width: '70px' }}
                            controls={false}
                        />
                        <Button
                            icon={<ReloadOutlined />}
                            size="small"
                            onClick={handleReset}
                            disabled={disabled || !isRangeValidForControls} // Disable if range is invalid
                            aria-label="Reset range to full"
                            style={{ marginLeft: '5px' }}
                        />
                    </Space>
                </div>
            </div>
        );
    }
);

export default SlidingWindowFilter;
