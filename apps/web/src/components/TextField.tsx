import { TextInput } from '@astryxdesign/core/TextInput';
import type { ComponentProps } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

type TextInputProps = ComponentProps<typeof TextInput>;

interface TextFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  type?: TextInputProps['type'];
  autoComplete?: string;
  description?: string;
  inputMode?: TextInputProps['inputMode'];
  hasAutoFocus?: boolean;
  isOptional?: boolean;
}

/**
 * An Astryx TextInput bound to react-hook-form. The error shows under the field (attached
 * status, announced by Astryx); validation runs on submit (craft: never disable submit).
 */
export function TextField<T extends FieldValues>({ control, name, ...props }: TextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextInput
          {...props}
          htmlName={name}
          value={field.value ?? ''}
          onChange={(value) => field.onChange(value)}
          isRequired={!props.isOptional}
          width="100%"
          status={
            fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined
          }
        />
      )}
    />
  );
}
