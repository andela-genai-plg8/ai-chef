# Functions Project

This project contains the backend logic for the application, implemented as Firebase Cloud Functions. It includes various controllers, providers, and utilities to handle application-specific tasks.

## Project Structure

```
functions/
├── firebase-debug.log       # Debug logs for Firebase
├── index.js                # Entry point for Firebase functions
├── package.json            # Project dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── lib/                    # Compiled JavaScript files
├── src/                    # Source TypeScript files
│   ├── controllers/        # Controllers for handling specific tasks
│   │   ├── chat.ts         # Chat-related logic
│   │   ├── findRecipe.ts   # Recipe-finding logic
│   │   └── ...
│   ├── providers/          # Providers for external services
│   ├── utils/              # Utility functions
│   └── index.ts            # Main entry point for the source code
```

## Prerequisites

- Node.js (v22 or later)
- Firebase CLI
- TypeScript

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Initialize Firebase (if not already done):
   ```bash
   firebase init
   ```

3. Compile TypeScript to JavaScript:
   ```bash
   npm run build
   ```

4. Start the Firebase emulators:
   ```bash
   firebase emulators:start --only functions,firestore
   ```

## Scripts

- `npm run build`: Compiles TypeScript files to JavaScript.
- `npm run serve`: Serves the functions locally using Firebase emulators.
- `npm run watch`: Watches for changes in TypeScript files and recompiles them.

## Environment Variables

Environment variables are loaded from `.env` files. Ensure you have the following files configured:

- `.env`: General environment variables.
- `.env.local`: Local development variables.

## Deployment

To deploy the functions to Firebase:

```bash
firebase deploy --only functions
```

## Debugging

- Logs are available in `firebase-debug.log`.
- Use the Firebase Emulator Suite for local testing.

## Contributing

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Commit your changes and push the branch.
4. Create a pull request.

## License

This project is licensed under the MIT License.

## Chef Class and Subclasses

The `Chef` class and its subclasses are responsible for handling various AI-driven functionalities, such as generating recipes, interacting with external APIs, and managing AI agents. Below is an overview of the `Chef` class and its key subclasses:

### Chef Class
- **Purpose**: Serves as the base class for all chef-related functionalities.
- **Responsibilities**:
  - Provides common methods and properties shared across all chef implementations.
  - Acts as a blueprint for creating specific chef types.

### Subclasses

#### `ChefFactory`
- **Purpose**: A factory class for creating instances of different chef types.
- **Responsibilities**:
  - Provides a unified interface for instantiating chef subclasses.
  - Ensures proper configuration of chef instances.

#### `GPTChef`
- **Purpose**: Specializes in handling OpenAI GPT-based functionalities.
- **Responsibilities**:
  - Generates recipes and other content using GPT models.
  - Manages chat interactions and tool calls.

#### `OllamaChef`
- **Purpose**: Focuses on integrating with the Ollama API.
- **Responsibilities**:
  - Fetches and processes data from the Ollama service.
  - Implements Ollama-specific logic for recipe generation.

#### `GeminiChef`
- **Purpose**: Handles functionalities related to the Gemini AI platform.
- **Responsibilities**:
  - Integrates with Gemini APIs.
  - Provides advanced AI-driven features for recipe creation.

Each subclass extends the `Chef` class and customizes its behavior to suit specific use cases or external integrations.
