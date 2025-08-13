export type Model = {
  id?: string;
  title: string;
  description?: string;
  provider?: string;
  max_tokens?: number;
  temperature?: number;
};

export type SupportedModels = {
  [provider: string]: {
    title: string;
    supported: boolean;
    models: {
      [modelId: string]: Model;
    };
  };
};
