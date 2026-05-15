
export interface Get_Login_Data_Package {
    Account_Details: IAccountDetails;
    User_Details: IUserDetails;
    Entity_Details: IEntityDetails;
    Functions_Details: IFunctionsDetails;
    Modules_Details: IModulesDetails;
    Account_Settings: IAccountSettings;
    User_Accounts?: IUserAccountItem[];
}


export interface IAccountDetails {
    Account_ID: number;
    Email: string;
    Description: string;
    Description_Regional: string;
    User_ID: number;
    Entity_ID: number;
    Entity_Role_ID: number;
    Account_State: number;
    Two_FA: boolean;
    Profile_Picture: string;
    System_Role_ID: number;
}


export interface IUserDetails {
    User_ID: number;
    First_Name: string;
    Middle_Name: string;
    Last_Name: string;
    Prefix: string;
    First_Name_Regional: string;
    Middle_Name_Regional: string;
    Last_Name_Regional: string;
    Prefix_Regional: string;
    Gender: boolean;
    Is_Active: boolean;
}


export interface IEntityDetails {
    Entity_ID: number;
    Code: string;
    Name: string;
    Description: string;
    Name_Regional: string;
    Description_Regional: string;
    Parent_Entity_ID: number;
    Is_Active: boolean;
    Is_Personal: boolean;
    Logo: string;
}


export interface IFunctionDetail {
    FunctionID: number;
    Name: string;
    Name_Regional: string;
    Default_Order: number;
    URL: string;
}

export interface IFunctionsDetails {
    SysAdm: IFunctionDetail;
    EntAdm: IFunctionDetail;
    DC: IFunctionDetail;
    FIN: IFunctionDetail;
    CRM: IFunctionDetail;
    SCM: IFunctionDetail;
    PC: IFunctionDetail;
}


export interface IModuleDetail {
    ModuleID: number;
    FunctionID: number;
    Name: string;
    Name_Regional: string;
    Default_Order: number;
    URL: string;
}

export interface IModulesDetails {
    [key: string]: IModuleDetail;
}

export interface IAccountSettings {
    Language: string;
    Theme: string;
    Functions_Order: string;
    Modules_Order: string;
}

export interface IUserAccountItem {
    Account_ID: number;
    Email: string;
    Entity_ID: number;
    Entity_Role_ID: number;
    Description: string;
    Description_Regional: string;
    AccountState: number;
    SystemRole: number;
}

export interface IAccountStatusResponse {
    Account_Details: IAccountDetails;
    User_Details: IUserDetails;
    Entity_Details: IEntityDetails;
    Functions_Details: IFunctionsDetails;
    Modules_Details: IModulesDetails;
    Account_Settings: IAccountSettings;
    User_Accounts?: IUserAccountItem[];
}


export interface IMenuFunction {
    code: string;
    name: string;
    nameRegional: string;
    defaultOrder: number;
    icon?: string;
    modules: IMenuModule[];
    url: string;
}

export interface IMenuModule {
    code: string;
    name: string;
    nameRegional: string;
    defaultOrder: number;
    url: string;
    icon?: string;
    isImplemented: boolean;
    moduleId: number;
    functionCode: string;
}

