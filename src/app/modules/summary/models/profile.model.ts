// Backend response interfaces (from API)
export interface ProfileDetailsBackend {
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

export interface ProfileContactInfoBackend {
    Address: string;
    Address_Regional: string;
    Phone_Numbers: string[];
    Linkedin_Page: string;
    Facebook_Page: string;
    Instagram_Page: string;
    Twitter_Page: string;
}

export interface ProfilePreferencesBackend {
    User_Preferences: Record<string, string>;
}

export interface ProfilePictureBackend {
    Image_Format: string;
    Image: string; // Base64 encoded
}

// Frontend normalized interfaces
export interface ProfileDetails {
    id: number;
    firstName: string;
    middleName: string;
    lastName: string;
    prefix: string;
    gender: boolean;
    isActive: boolean;
}

export interface ProfileContactInfo {
    address: string;
    phoneNumbers: string[];
    linkedinPage: string;
    facebookPage: string;
    instagramPage: string;
    twitterPage: string;
}

export interface ProfilePreferences {
    [key: string]: string;
}

// Keep existing interfaces
export interface ProfileOverview {
    fullName: string;
    role: string;
    avatarUrl: string;
}

export interface PasswordChangePayload {
    oldPassword: string;
    newPassword: string;
}

