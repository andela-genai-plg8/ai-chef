export type Model = {
  id?: string;
  title: string;
  description?: string;
  provider?: string;
  max_tokens?: number;
  temperature?: number;
  supported?: boolean;
  default?: boolean;
};

export type SupportedModels = {
  [provider: string]: {
    title: string;
    models: Model[];
  };
};

export type AppUserData = {
  id: string;
  email: string;
  roles?: string[];
  createdAt?: any;
  lastLoginAt?: any;
  lastLogoutAt?: any;
};
