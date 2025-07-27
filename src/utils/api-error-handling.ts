// src/utils/api-error-handling.ts
export interface ApiError {
  success: false;
  error: string;
  errorType: string;
  details?: string;
  timestamp?: string;
}

export interface ApiSuccess<T = any> {
  success: true;
  data?: T;
  timestamp?: string;
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError;

// Common error types
export const ERROR_TYPES = {
  // Authentication & Authorization
  AUTH_ERROR: "auth_error",
  WALLET_ACCESS_DENIED: "wallet_access_denied",

  // Validation Errors
  VALIDATION_ERROR: "validation_error",
  INVALID_ADDRESS: "invalid_address",
  INVALID_AMOUNT: "invalid_amount",
  INSUFFICIENT_BALANCE: "insufficient_balance",
  INSUFFICIENT_FUNDS: "insufficient_funds",
  SELF_TRANSFER: "self_transfer",

  // Transaction Errors
  TRANSACTION_ERROR: "transaction_error",
  GAS_ERROR: "gas_error",
  GAS_ESTIMATION_ERROR: "gas_estimation_error",
  NONCE_ERROR: "nonce_error",
  EXECUTION_ERROR: "execution_error",

  // Network & System Errors
  NETWORK_ERROR: "network_error",
  TIMEOUT_ERROR: "timeout_error",
  DATABASE_ERROR: "database_error",
  INTERNAL_ERROR: "internal_error",

  // Wallet Errors
  WALLET_ERROR: "wallet_error",
  MISSING_PRIVATE_KEY: "missing_private_key",
  DECRYPTION_ERROR: "decryption_error",

  // API Errors
  API_ERROR: "api_error",
  PREVIEW_ERROR: "preview_error",
  PARSE_ERROR: "parse_error",
  INVALID_ACTION: "invalid_action",
} as const;

// User-friendly error messages
export const ERROR_MESSAGES = {
  [ERROR_TYPES.AUTH_ERROR]: "Authentication required",
  [ERROR_TYPES.WALLET_ACCESS_DENIED]: "Wallet access denied",
  [ERROR_TYPES.VALIDATION_ERROR]: "Invalid input",
  [ERROR_TYPES.INVALID_ADDRESS]: "Invalid address format",
  [ERROR_TYPES.INVALID_AMOUNT]: "Invalid amount",
  [ERROR_TYPES.INSUFFICIENT_BALANCE]: "Insufficient balance",
  [ERROR_TYPES.INSUFFICIENT_FUNDS]: "Insufficient funds",
  [ERROR_TYPES.SELF_TRANSFER]: "Cannot send to yourself",
  [ERROR_TYPES.TRANSACTION_ERROR]: "Transaction failed",
  [ERROR_TYPES.GAS_ERROR]: "Gas estimation failed",
  [ERROR_TYPES.GAS_ESTIMATION_ERROR]: "Unable to estimate gas",
  [ERROR_TYPES.NONCE_ERROR]: "Transaction timing issue",
  [ERROR_TYPES.EXECUTION_ERROR]: "Execution failed",
  [ERROR_TYPES.NETWORK_ERROR]: "Network connection issue",
  [ERROR_TYPES.TIMEOUT_ERROR]: "Request timed out",
  [ERROR_TYPES.DATABASE_ERROR]: "Database error",
  [ERROR_TYPES.INTERNAL_ERROR]: "Internal server error",
  [ERROR_TYPES.WALLET_ERROR]: "Wallet error",
  [ERROR_TYPES.MISSING_PRIVATE_KEY]: "Private key required",
  [ERROR_TYPES.DECRYPTION_ERROR]: "Wallet decryption failed",
  [ERROR_TYPES.API_ERROR]: "API error",
  [ERROR_TYPES.PREVIEW_ERROR]: "Preview failed",
  [ERROR_TYPES.PARSE_ERROR]: "Invalid request format",
  [ERROR_TYPES.INVALID_ACTION]: "Invalid action",
} as const;

// Detailed error descriptions for better UX
export const ERROR_DETAILS = {
  [ERROR_TYPES.AUTH_ERROR]: "Please log in to continue",
  [ERROR_TYPES.WALLET_ACCESS_DENIED]:
    "This wallet is not associated with your account",
  [ERROR_TYPES.INVALID_ADDRESS]:
    'Please check the address format. It should start with "0x" and be 42 characters long.',
  [ERROR_TYPES.INVALID_AMOUNT]:
    "Amount must be a positive number greater than 0",
  [ERROR_TYPES.INSUFFICIENT_BALANCE]:
    "You don't have enough tokens for this transaction",
  [ERROR_TYPES.INSUFFICIENT_FUNDS]:
    "Insufficient funds to complete this transaction including gas fees",
  [ERROR_TYPES.SELF_TRANSFER]:
    "The sender and recipient addresses cannot be the same",
  [ERROR_TYPES.GAS_ESTIMATION_ERROR]:
    "Unable to estimate transaction fees. Please try again.",
  [ERROR_TYPES.NETWORK_ERROR]:
    "Please check your internet connection and try again",
  [ERROR_TYPES.TIMEOUT_ERROR]: "The request took too long. Please try again.",
  [ERROR_TYPES.WALLET_ERROR]:
    "There was an issue with your wallet. Please try again.",
  [ERROR_TYPES.DECRYPTION_ERROR]:
    "Unable to access your wallet. Please try importing your wallet again.",
  [ERROR_TYPES.DATABASE_ERROR]:
    "Unable to access wallet information. Please try again.",
} as const;

// Create standardized error response
export function createErrorResponse(
  message: string,
  errorType: string = ERROR_TYPES.VALIDATION_ERROR,
  details?: string,
  statusCode: number = 400
) {
  const response = {
    success: false as const,
    error: message,
    errorType,
    details: details || ERROR_DETAILS[errorType as keyof typeof ERROR_DETAILS],
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: { "Content-Type": "application/json" },
  });
}

// Create standardized success response
export function createSuccessResponse<T>(data: T, statusCode: number = 200) {
  const response = {
    success: true as const,
    ...data,
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: { "Content-Type": "application/json" },
  });
}

// Parse and handle API error responses on the frontend
export async function handleApiResponse<T>(
  response: Response
): Promise<ApiResponse<T>> {
  try {
    const data = await response.json();

    if (!response.ok) {
      // If it's our standardized error format
      if (data.errorType && data.error) {
        return data as ApiError;
      }

      // Fallback for other error formats
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        errorType: ERROR_TYPES.API_ERROR,
        details: data.details || "An unexpected error occurred",
      };
    }

    // Success response
    if (data.success !== false) {
      return {
        success: true,
        data: data,
      };
    }

    // Handle success: false in response body
    return {
      success: false,
      error: data.error || "Operation failed",
      errorType: data.errorType || ERROR_TYPES.API_ERROR,
      details: data.details,
    };
  } catch (parseError) {
    return {
      success: false,
      error: `HTTP ${response.status}: ${response.statusText}`,
      errorType: ERROR_TYPES.PARSE_ERROR,
      details: "Unable to parse server response",
    };
  }
}

// Utility to check if an error is retryable
export function isRetryableError(errorType: string): boolean {
  const retryableErrors = [
    ERROR_TYPES.NETWORK_ERROR,
    ERROR_TYPES.TIMEOUT_ERROR,
    ERROR_TYPES.GAS_ESTIMATION_ERROR,
    ERROR_TYPES.NONCE_ERROR,
  ];

  return retryableErrors.includes(errorType as any);
}

// Get user-friendly error message
export function getUserFriendlyError(error: ApiError): {
  title: string;
  message: string;
  canRetry: boolean;
} {
  const title =
    ERROR_MESSAGES[error.errorType as keyof typeof ERROR_MESSAGES] ||
    error.error;
  const message =
    error.details ||
    ERROR_DETAILS[error.errorType as keyof typeof ERROR_DETAILS] ||
    error.error;
  const canRetry = isRetryableError(error.errorType);

  return { title, message, canRetry };
}

// Enhanced error logging for debugging
export function logApiError(error: ApiError, context?: string) {
  console.group(`🚨 API Error${context ? ` - ${context}` : ""}`);
  console.error("Type:", error.errorType);
  console.error("Message:", error.error);
  if (error.details) console.error("Details:", error.details);
  if (error.timestamp) console.error("Timestamp:", error.timestamp);
  console.groupEnd();
}

// React hook for handling API calls with proper error handling
export function useApiCall() {
  const handleApiCall = async <T>(
    apiCall: () => Promise<Response>,
    options?: {
      onSuccess?: (data: T) => void;
      onError?: (error: ApiError) => void;
      context?: string;
    }
  ): Promise<ApiResponse<T>> => {
    try {
      const response = await apiCall();
      const result = await handleApiResponse<T>(response);

      if (result.success) {
        options?.onSuccess?.(result.data as T);
      } else {
        if (options?.context) {
          logApiError(result, options.context);
        }
        options?.onError?.(result);
      }

      return result;
    } catch (networkError: any) {
      const error: ApiError = {
        success: false,
        error: "Network error",
        errorType: ERROR_TYPES.NETWORK_ERROR,
        details:
          "Unable to connect to the server. Please check your internet connection.",
      };

      if (options?.context) {
        logApiError(error, options.context);
      }
      options?.onError?.(error);

      return error;
    }
  };

  return { handleApiCall };
}

// Validation utilities
export function validateWalletAddress(address: string): {
  isValid: boolean;
  error?: ApiError;
} {
  if (!address || typeof address !== "string") {
    return {
      isValid: false,
      error: {
        success: false,
        error: ERROR_MESSAGES[ERROR_TYPES.INVALID_ADDRESS],
        errorType: ERROR_TYPES.INVALID_ADDRESS,
        details: "Address is required",
      },
    };
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return {
      isValid: false,
      error: {
        success: false,
        error: ERROR_MESSAGES[ERROR_TYPES.INVALID_ADDRESS],
        errorType: ERROR_TYPES.INVALID_ADDRESS,
        details: ERROR_DETAILS[ERROR_TYPES.INVALID_ADDRESS],
      },
    };
  }

  return { isValid: true };
}

export function validateAmount(
  amount: string,
  balance?: string
): { isValid: boolean; error?: ApiError } {
  if (!amount || typeof amount !== "string") {
    return {
      isValid: false,
      error: {
        success: false,
        error: ERROR_MESSAGES[ERROR_TYPES.INVALID_AMOUNT],
        errorType: ERROR_TYPES.INVALID_AMOUNT,
        details: "Amount is required",
      },
    };
  }

  const numAmount = parseFloat(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    return {
      isValid: false,
      error: {
        success: false,
        error: ERROR_MESSAGES[ERROR_TYPES.INVALID_AMOUNT],
        errorType: ERROR_TYPES.INVALID_AMOUNT,
        details: ERROR_DETAILS[ERROR_TYPES.INVALID_AMOUNT],
      },
    };
  }

  if (balance) {
    const numBalance = parseFloat(balance);
    if (numAmount > numBalance) {
      return {
        isValid: false,
        error: {
          success: false,
          error: ERROR_MESSAGES[ERROR_TYPES.INSUFFICIENT_BALANCE],
          errorType: ERROR_TYPES.INSUFFICIENT_BALANCE,
          details: `You're trying to send ${numAmount}, but you only have ${numBalance} available.`,
        },
      };
    }
  }

  return { isValid: true };
}
