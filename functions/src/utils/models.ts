import { SupportedModels } from "shared-types";

export const MODELS: SupportedModels = {
  gpt: {
    title: "GPT",
    supported: true,
    models: {
      "gpt-gpt-4o-mini": {
        max_tokens: 1024,
        temperature: 0.7,
        title: "GPT-4o Mini",
        provider: "openai",
      },
      "gpt-gpt-4o": {
        max_tokens: 2048,
        temperature: 0.7,
        title: "GPT-4o",
        provider: "openai",
      },
      "gpt-gpt-4-turbo": {
        max_tokens: 8192,
        temperature: 0.7,
        title: "GPT-4",
        provider: "openai",
      },
      "gpt-gpt-3.5-turbo": {
        max_tokens: 16384,
        temperature: 0.7,
        title: "GPT-3.5 Turbo 16k",
        provider: "openai",
      },
    },
  },
  google: {
    title: "Gemini",
    supported: false,
    models: {
      "google-gemini-pro": {
        max_tokens: 30720,
        temperature: 0.7,
        title: "Gemini Pro Vision",
        provider: "google",
      },
    },
  },
  claude: {
    title: "Claude",
    supported: false,
    models: {
      "anthropic-claude-3-opus-20240229": {
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
      "anthropic-claude-3-haiku-20240307": {
        max_tokens: 200000,
        temperature: 0.7,
        title: "Claude 3 Haiku",
        provider: "anthropic",
      },
    },
  },
  grok: {
    title: "Grok",
    supported: false,
    models: {
      "xai-grok-1": {
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
      "xai-grok-1.5": {
        max_tokens: 128000,
        temperature: 0.7,
        title: "Grok-1.5V",
        provider: "xai",
      },
    },
  },
  ollama: {
    title: "Ollama",
    supported: true,
    models: {
      "ollama-llama3.2": {
        max_tokens: 8192,
        temperature: 0.7,
        title: "Llama 3.2",
        provider: "ollama",
        supported: true
      },
    },
  },
};
