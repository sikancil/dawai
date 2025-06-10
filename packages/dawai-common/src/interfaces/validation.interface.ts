export interface ValidationSuggestion {
  severity: 'warning' | 'error' | 'info'; // For future use, default to 'warning'
  message: string;
  className: string;
  methodName?: string;
  parameterIndex?: number;

  // New structured fields:
  decoratorInvolved?: string; // e.g., "@crud", "@Body"
  keyInvolved?: string;       // e.g., "method" (option of @crud), "schema", or a parameter name
  expectedPattern?: string;   // Description of the expected pattern, value, or state
  actualPattern?: string;     // Description of the actual pattern, value, or state found
  suggestionCode?: string;    // A unique code for the type of suggestion (e.g., "DAWAI-VAL-001")
}
