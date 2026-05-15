/**
 * Backend Function Response Structure
 * Represents the raw function data structure from the API
 */
export interface FunctionBackend {
    Function_ID: number;
    Code: string;
    Name: string;
    Name_Regional?: string;
    Default_Order?: number;
    URL?: string;
    Is_Active?: boolean;
}

/**
 * Backend Module Response Structure
 * Represents the raw module data structure from the API
 */
export interface ModuleBackend {
    Module_ID: number;
    Function_ID: number;
    Code: string;
    Name: string;
    Name_Regional?: string;
    Default_Order?: number;
    URL?: string;
    Is_Active?: boolean;
}

/**
 * Backend API Response Structure for Functions List
 * The message contains an object where keys are function IDs and values are FunctionBackend objects
 */
export interface FunctionsListResponse {
    success: boolean;
    message?: {
        Functions_List?: Record<string, FunctionBackend>;
    };
}

/**
 * Backend API Response Structure for Modules List
 * The message contains an object where keys are module IDs and values are ModuleBackend objects
 */
export interface ModulesListResponse {
    success: boolean;
    message?: {
        Modules_List?: Record<string, ModuleBackend>;
    };
}

/**
 * Frontend Function Model
 * Represents the normalized function data used in components
 */
export interface Function {
    id: number;
    code: string;
    name: string;
    nameRegional?: string;
    defaultOrder?: number;
    url?: string;
    isActive?: boolean;
}

/**
 * Frontend Module Model
 * Represents the normalized module data used in components
 */
export interface Module {
    id: number;
    functionId: number;
    code: string;
    name: string;
    nameRegional?: string;
    defaultOrder?: number;
    url?: string;
    isActive?: boolean;
}

/**
 * Backend API Response Structure for Function Details
 */
export interface FunctionDetailsResponse {
    success: boolean;
    message?: FunctionBackend;
}

/**
 * Backend API Response Structure for Function Create
 */
export interface FunctionCreateResponse {
    success: boolean;
    message?: {
        Function_ID: number;
    };
}

/**
 * Backend API Response Structure for Function Logo
 */
export interface FunctionLogoResponse {
    success: boolean;
    message?: {
        Image_Format: string;
        Image: string; // base64 encoded
    };
}

/**
 * Backend API Response Structure for Module Details
 */
export interface ModuleDetailsResponse {
    success: boolean;
    message?: ModuleBackend;
}

/**
 * Backend API Response Structure for Module Create
 */
export interface ModuleCreateResponse {
    success: boolean;
    message?: {
        Module_ID: number;
    };
}

/**
 * Backend API Response Structure for Module Logo
 */
export interface ModuleLogoResponse {
    success: boolean;
    message?: {
        Image_Format: string;
        Image: string; // base64 encoded
    };
}
