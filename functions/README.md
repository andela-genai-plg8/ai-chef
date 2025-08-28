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
   firebase emulators:start --only functions,firestore --project ai-chef
   ```

5. Start `qdrant` vector database:
   ```bash
   docker run -p 6333:6333 -p 6334:6334 -v $YOUR_STORAGE_DIR/qdrant_storage:/qdrant/storage qdrant/qdrant
   ```

6. Set up initial data

Go to `http://127.0.0.1:5001/ai-chef/us-central1/bootstrap` to trigget the bootstrap function and set up firestore with initial recipes, calculate embeddings, and add them to qdrant database. It uses `RESOURCES_DIR` envronment variable and the recipes file uploaded as attachment in issue `#1`.

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

The `Chef` class and its subclasses are responsible for handling various AI-driven functionalities, such as matching ingredients to recipes. Ultimately, the AI models and present a common interface that abstracts away the details of the provider from the rest of the application. Below is an overview of the `Chef` class and its key subclasses:

### Chef Class
- **Purpose**: Serves as the base class for all chef-related functionalities.
- **Responsibilities**:
  - Provides common methods and properties shared across all chef implementations.
  - Acts as a blueprint for creating specific chef types.

A Chef is expected to engage the user and recommend recipes to them based on the ingredients they provided during the conversation.

### Subclasses

#### `GPTChef`
- **Purpose**: Specializes in handling OpenAI GPT-based functionalities.
- **Responsibilities**:
  - Generates recipes and other content using GPT models.
  - Manages chat interactions and tool calls.

#### `OllamaChef`
- **Purpose**: Focuses on integrating with the Ollama API.
- **Responsibilities**:
  - Generates recipes and other content using Ollama models.
  - Manages chat interactions and tool calls.

#### `GeminiChef`
- **Purpose**: Implementation of Chef based on Gemini.
- **Responsibilities**:
  - Generates recipes and other content using Ollama models.
  - Manages chat interactions and tool calls.

Each subclass extends the `Chef` class and customizes its behavior to suit specific use cases or model integrations.

### `ChefFactory`
- **Purpose**: A factory class for creating instances of different chef types.
- **Responsibilities**:
  - It returns the spefic chef implementation based on the model string provided to it.
  - It assumes that model strings have the format <provide>-<model> eg. gpt-gpt-4o-mini

### Example Usage of the Chef Class

Here is an example of how the `Chef` class can be used in the application, following the pattern used in the controllers:

```typescript
import { ChefFactory } from "./providers/ChefFactory";

// Get a Chef subclass instance using the ChefFactory
const chefInstance = ChefFactory.getChef({
  model: "gpt-gpt-4o-mini",
  history: [
    { role: "user", content: "What can I cook with chicken and broccoli?" },
  ],
  name: "ChefBot",
});

// Get the response from the model
async function interactWithChef() {
  try {
    const response = await chefInstance.getResponse();
    console.log("Model Response:", response);

    // Get recipe recommendations
    const recipes = await chefInstance.getRecipeRecommendations();
    console.log("Recommended Recipes:", recipes);

    // Get ingredients deduced from the conversation
    const ingredients = await chefInstance.getIngredients();
    console.log("Deduced Ingredients:", ingredients);
  } catch (error) {
    console.error("Error interacting with Chef:", error);
  }
}

interactWithChef();
```

This example demonstrates how to use the `ChefFactory` to create a `Chef` subclass instance and interact with it to get responses, recipe recommendations, and deduced ingredients.

### Subclass Implementation Guidelines

Subclasses of the `Chef` class should adhere to the following guidelines:

1. **Constructor**:
   - Ensure that the `super` constructor is invoked.
   - If there is a need to alter the system prompt, it can be done by replacing the first item in the `history` property.

   Example:
   ```typescript
   import { Chef } from "./Chef";

   export class CustomChef extends Chef {
     constructor(context: string, chatHistory: any[], preferredName: string) {
       super(context, chatHistory, preferredName);
       // Modify the system prompt if needed
       this.history[0] = { role: "system", content: "Custom system prompt" };
     }
   }
   ```

2. **`getResponse` Method**:
   - Implement the `getResponse` async method.
   - Pass tool descriptions to the model in the syntax supported by the model.
   - Handle the tool calls made by the model.
   - Use the parent class's tool functions for specific tasks:
     - `searchForMatchingRecipe(ingredient: string)` for the `search_recipes` tool.
     - For the `display_recipes` tool, set the `recipeRecommendations` property with the JSON-formatted recommendations returned by the model.

   Example:
   ```typescript
   async getResponse() {
     // Pass tool descriptions to the model
     const toolDescriptions = [
       { name: "search_recipes", description: "Search for recipes based on ingredients." },
       { name: "display_recipes", description: "Display recommended recipes." },
     ];

     const response = await this.model.generateResponse(this.history, toolDescriptions);

     // Handle tool calls
     if (response.toolCall === "search_recipes") {
       const ingredient = response.toolInput;
       const recipes = await this.searchForMatchingRecipe(ingredient);
       this.history.push({ role: "assistant", content: JSON.stringify(recipes) });
     } else if (response.toolCall === "display_recipes") {
       this.recipeRecommendations = JSON.parse(response.toolOutput);
     }

     return response;
   }
   ```

By following these guidelines, subclasses can ensure consistent behavior and leverage the functionality provided by the `Chef` base class.

