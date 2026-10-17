import React from 'react';
import {
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Tooltip,
  IconButton,
  Box,
  Typography,
  alpha,
  useTheme
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { Controller, Control } from 'react-hook-form';

interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: Array<{ value: number; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

interface FormFieldProps {
  field: FieldConfig;
  control: Control<any>;
  error?: string;
  description?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  field,
  control,
  error,
  description
}) => {
  const theme = useTheme();
  const { name, label, type, options, min, max, step, placeholder } = field;

  return (
    <Box sx={{ mb: 3, width: '100%' }}>
      {/* Question Label - Clearly visible */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography 
          variant="body1" 
          fontWeight={600} 
          sx={{ 
            color: theme.palette.text.primary,
            fontSize: '1rem',
          }}
        >
          {label}
          <Typography component="span" sx={{ color: theme.palette.error.main, ml: 0.5 }}>
            *
          </Typography>
        </Typography>
        
        {/* Info Tooltip */}
        {description && (
          <Tooltip 
            title={description} 
            arrow 
            placement="top"
            componentsProps={{
              tooltip: {
                sx: {
                  bgcolor: theme.palette.primary.main,
                  color: 'white',
                  fontSize: '0.875rem',
                  p: 1.5,
                  borderRadius: 1,
                  maxWidth: 300,
                },
              },
            }}
          >
            <IconButton
              size="small"
              sx={{
                ml: 1,
                color: theme.palette.primary.main,
                width: 24,
                height: 24,
              }}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Input Field - Below the label */}
      {type === 'select' && options ? (
        <FormControl fullWidth error={!!error} size="medium">
          <Controller
            name={name}
            control={control}
            defaultValue={null}
            render={({ field: { onChange, value } }) => (
              <Select
                value={value !== null && value !== undefined ? value : ''}
                onChange={(e) => {
                  // Ensure numeric values are sent to backend (not strings)
                  const numericValue = parseInt(e.target.value as string, 10);
                  onChange(isNaN(numericValue) ? e.target.value : numericValue);
                }}
                displayEmpty
                sx={{
                  backgroundColor: alpha(theme.palette.background.paper, 0.6),
                  '& .MuiSelect-select': {
                    py: 1.5,
                  },
                }}
              >
                <MenuItem value="">
                  <em>Select an option</em>
                </MenuItem>
                {options.map((option) => (
                  <MenuItem key={`${name}-${option.value}`} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
          {error && (
            <FormHelperText sx={{ color: theme.palette.error.main, mt: 0.5 }}>
              {error}
            </FormHelperText>
          )}
        </FormControl>
      ) : (
        <Controller
          name={name}
          control={control}
          defaultValue=""
          render={({ field: { onChange, value } }) => (
            <TextField
              fullWidth
              type={type}
              value={value || ''}
              onChange={onChange}
              error={!!error}
              helperText={error}
              placeholder={placeholder || `Enter ${label.toLowerCase()}`}
              size="medium"
              inputProps={{
                min,
                max,
                step,
              }}
              sx={{
                backgroundColor: alpha(theme.palette.background.paper, 0.6),
                '& .MuiOutlinedInput-root': {
                  '& input': {
                    py: 1.5,
                  },
                },
              }}
            />
          )}
        />
      )}
    </Box>
  );
};