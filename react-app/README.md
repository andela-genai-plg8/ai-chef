# Recipe Maker App – React Frontend

This directory contains the React single-page application (SPA) for the Recipe Maker App, built with Vite for fast development and modern tooling.

## Features in This Frontend

- **Ingredient Input:** Users can enter a list of ingredients to get recipe suggestions.
- **Meal Inspiration:** Request meal ideas even without providing ingredients.
- **Recipe Details:** View step-by-step instructions, watch video tutorials, and see a map of nearby restaurants offering the meal.
- **Order Integration:** Place orders from local restaurants directly within the app.
- **Live Chat:** Ask questions about recipes or meals in a built-in chat window.

## Tech Stack
- React (with Vite for HMR and fast builds)
- Bootstrap for UI styling
- Integration with Firebase Functions for backend/API
- Google Maps and video embedding for recipe pages

## Development

1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the development server:
   ```sh
   npm run dev
   ```
3. The app will be available at `http://localhost:5173` (or as shown in your terminal).

## Notes
- API calls (e.g., for chat or recipe suggestions) are proxied to the backend (Firebase Functions).
- For production, the app is built and output to the `dist/` directory, which is then served by Firebase Hosting.

---

This frontend is designed for a clean, intuitive, and visually appealing user experience. For backend/API and deployment details, see the main project README.
