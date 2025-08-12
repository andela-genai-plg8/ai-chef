export const MODELS = {
  gpt: {
    title: "GPT",
    models: {
      "gpt-4o-mini": {
        max_tokens: 1024,
        temperature: 0.7,
        title: "GPT-4o Mini",
        provider: "openai",
      },
      "gpt-4o": {
        max_tokens: 2048,
        temperature: 0.7,
        title: "GPT-4o",
        provider: "openai",
      },
      "gpt-4-turbo": {
        max_tokens: 128000,
        temperature: 0.7,
        title: "GPT-4 Turbo",
        provider: "openai",
      },
      "gpt-4": {
        max_tokens: 8192,
        temperature: 0.7,
        title: "GPT-4",
        provider: "openai",
      },
      "gpt-3.5-turbo": {
        max_tokens: 4096,
        temperature: 0.7,
        title: "GPT-3.5 Turbo",
        provider: "openai",
      },
      "gpt-3.5-turbo-16k": {
        max_tokens: 16384,
        temperature: 0.7,
        title: "GPT-3.5 Turbo 16k",
        provider: "openai",
      },
    },
  },
  gemini: {
    title: "Gemini",
    models: {
      "gemini-1": {
        max_tokens: 32768,
        temperature: 0.7,
        title: "Gemini 1",
        provider: "google",
      },
      "gemini-1.5-pro": {
        max_tokens: 32768,
        temperature: 0.7,
        title: "Gemini 1.5 Pro",
        provider: "google",
      },
      "gemini-1.5-flash": {
        max_tokens: 32768,
        temperature: 0.7,
        title: "Gemini 1.5 Flash",
        provider: "google",
      },
      "gemini-pro": {
        max_tokens: 30720,
        temperature: 0.7,
        title: "Gemini Pro",
        provider: "google",
      },
      "gemini-pro-vision": {
        max_tokens: 30720,
        temperature: 0.7,
        title: "Gemini Pro Vision",
        provider: "google",
      },
    },
  },
  claude: {
    title: "Claude",
    models: {
      "claude-3-opus-20240229": {
        max_tokens: 200000,
        temperature: 0.7,
        title: "Claude 3 Opus",
        provider: "anthropic",
      },
      "claude-3-sonnet-20240229": {
        max_tokens: 200000,
        temperature: 0.7,
        title: "Claude 3 Sonnet",
        provider: "anthropic",
      },
      "claude-3-haiku-20240307": {
        max_tokens: 200000,
        temperature: 0.7,
        title: "Claude 3 Haiku",
        provider: "anthropic",
      },
    },
  },
  grok: {
    title: "Grok",
    models: {
      "grok-1": {
        max_tokens: 128000,
        temperature: 0.7,
        title: "Grok-1",
        provider: "xai",
      },
      "grok-1.5": {
        max_tokens: 128000,
        temperature: 0.7,
        title: "Grok-1.5",
        provider: "xai",
      },
      "grok-1.5v": {
        max_tokens: 128000,
        temperature: 0.7,
        title: "Grok-1.5V",
        provider: "xai",
      },
    },
  },
};
