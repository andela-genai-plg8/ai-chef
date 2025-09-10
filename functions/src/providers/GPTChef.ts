import API, { OpenAI } from "openai";
import { Chef, ChatHistory, ChatItem, GetResponseParams } from "./Chef";
import { Chat } from "openai/resources/index";
import { Recipe } from "shared-types";

/**
 * GPTChef - provider that talks to OpenAI and a Qdrant vector store.
 *
 * Responsibilities:
 *  - build embeddings for ingredient lists
 *  - perform a vector search against Qdrant to find matching recipes
 *  - call OpenAI chat completions and handle tool/function calls returned by the model
 */
export class GPTChef extends Chef {
  private openai?: InstanceType<typeof OpenAI>;

  constructor(name: string, model: string, history: ChatHistory = []) {
    super(name, model, history);
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Ask the model to normalize/extract ingredient names.
   * Delegates to the base class first to update history, then calls OpenAI and
   * attempts to parse a JSON object from the model's message content.
   */
  async getIngredientNames(ingredientListBlogs: string[]): Promise<any> {
    await super.getIngredientNames(ingredientListBlogs);

    const response = await this.openai!.chat.completions.create({
      model: this.model,
      messages: this.history as API.ChatCompletionMessageParam[],
    });

    // Try to extract a JSON object from the assistant message and parse it.
    const match = response.choices[0]?.message?.content?.match(/^{[\s\S\w\W]*}/s);
    if (match) {
      return JSON.parse(match[0]);
    }

    return [];
  }

  /**
   * Build an embedding for the provided ingredient text and query Qdrant.
   * Returns an array of matching recipes (payload) ordered by similarity.
   *
   * Note: Qdrant URL is read from environment variable `QDRANT_URL` and the
   * collection name is currently hard-coded to `ingredients`.
   */
  async searchForMatchingRecipeByVector(ingredients: string): Promise<any> {
    // store ingredients in the instance for later reference
    this.ingredients = ingredients.split("\n");
    console.info("Vector search with ingredients: " + JSON.stringify(ingredients));

    // create an embedding using OpenAI embeddings API
    const response = await this.openai!.embeddings.create({
      input: ingredients,
      model: "text-embedding-3-small", // or use 'text-embedding-3-large'
    });
    const embedding = response.data[0].embedding;
    console.info(`Searched embedding: '${ingredients}', length: ${embedding.length}`);

    // Query Qdrant for nearest neighbors. We send the vector and request payloads.
    const COLLECTION = "ingredients";
    const res = await fetch(`${process.env.QDRANT_URL}/collections/${COLLECTION}/points/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vector: {
          name: "small_model",
          vector: embedding,
        },
        top: 5,
        with_payload: true,
      }),
    });

    const data: any = await res.json();
    // extract payload (recipes) and scores from the Qdrant response
    const recipes = (data.result || []).map((d: any) => d.payload);
    const scores = (data.result || []).map((d: any) => d.score);

    console.log(`Returning recipes from searchForMatchingRecipeByVector: ${recipes.length} recipes, queried ingredients: ${ingredients}, scores: ${scores}`);

    this.recipeRecommendations = recipes as Recipe[];
    return this.recipeRecommendations;
  }

  async getResponse({ prompt, ...rest }: GetResponseParams = {}): Promise<string> {
    await super.getResponse({ prompt, ...rest });
    if (prompt) this.addToHistory({ role: "user", content: prompt });

    const call = async () => {
      console.log(this.history);
      console.log("Calling OpenAI API...");
      return await this.openai!.chat.completions.create({
        model: this.model, // or any model you've pulled
        messages: this.history as API.ChatCompletionMessageParam[],
        tools: [
          {
            type: "function",
            function: {
              name: "find_recipes",
              description: "Finds recipes based on ingredients. The response should be a JSON array of recipes.",
              parameters: {
                type: "object",
                properties: {
                  ingredients: { type: "array", items: { type: "string" }, description: "List of ingredients" },
                },
                required: ["ingredients"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "display_recipes",
              description: "Displays recipes to a special display. It returns a response stating the number recipes actually displayed.",
              parameters: {
                type: "object",
                properties: {
                  recipes: { type: "array", items: { type: "object" }, description: "List of recipes in JSON array format" },
                },
                required: ["recipes"],
              },
            },
          },
        ],
      });
    };

    let response = await call();
    let count = 0;
    let result: any = null;

    // Loop while the model requests tool calls. We limit to 5 iterations to avoid
    // an accidental infinite loop if the model keeps requesting tools.
    while (response.choices[0].finish_reason == "tool_calls" && count < 5) {
      // For each tool call requested by the model, handle the function name and
      // perform the corresponding action. We also record the tool activity in chat history.
      for (const toolCall of response.choices[0].message.tool_calls!) {
        const { content, role, ...rest } = response.choices[0].message;
        this.addToHistory({ sender: role, role, content, ...rest } as ChatItem);

        const functionCall = (toolCall as unknown as { function: Function }).function;

        switch (functionCall.name) {
          case "find_recipes": {
            // The model passes a JSON string in `arguments` containing ingredients array.
            const ingredients = JSON.parse(functionCall.arguments).ingredients.join("\n") as string;
            try {
              // reuse previous result if available, otherwise perform vector search
              result = result !== null ? result : await this.searchForMatchingRecipeByVector(ingredients);
              // Append a tool response message that the OpenAI API expects when
              // the assistant previously returned a tool_call. The message must
              // have role: 'tool', include the tool name, the content, and the
              // original tool_call_id so the model can continue the conversation.
              const content = `This is the data from the tool: ${JSON.stringify(result)}`;
              console.log(content);
              this.addToHistory({ role: "tool", name: functionCall.name, content, tool_call_id: toolCall.id });
            } catch (error) {
              const errorMessage = typeof error === "object" && error !== null && "message" in error ? (error as { message: string }).message : String(error);
              this.addToHistory({ role: "tool", name: functionCall.name, content: `Error calling Spoonacular API: ${errorMessage}`, tool_call_id: toolCall.id });
            }

            break;
          }
          case "display_recipes": {
            try {
              // The model asked to display recipes; we acknowledge the action in history.
              const recipes = JSON.parse(functionCall.arguments).recipes || [];
              this.recipeRecommendations = recipes;

              // Report back to the assistant that the display action completed.
              this.addToHistory({ role: "tool", name: functionCall.name, content: `${this.recipeRecommendations.length} recommendations will be displayed.`, tool_call_id: toolCall.id });
            } catch (error) {
              console.error("Error displaying recipes:", error);
              this.addToHistory({ role: "tool", name: functionCall.name, content: `Error displaying recipes: ${error}`, tool_call_id: toolCall.id });
            }

            break;
          }
          default:
            // Unknown function requested by model - record as unimplemented
            this.addToHistory({ role: "tool", name: functionCall.name, content: `The tool ${functionCall.name} is not implemented.`, tool_call_id: toolCall.id });
            break;
        }
      }

      // Call the model again so it can continue the conversation after tools ran
      try {
        response = await call();
      } catch (error) {
        console.error("Error calling model:", error);
      }
      count++;
    }

    return response.choices[0]?.message?.content || "";
  }
}
