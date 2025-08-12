# Recipe Maker App – React Frontend

This directory contains the React single-page application (SPA) for the Recipe Maker App, built with Vite for a fast, modern development experience.

## Key Features
- **Ingredient Input:** Enter a list of ingredients to get recipe suggestions.
- **Meal Inspiration:** Request meal ideas even without providing ingredients.
- **Recipe Details:** View step-by-step instructions, watch video tutorials, and see a map of nearby restaurants offering the meal.
- **Order Integration:** Place orders from local restaurants directly within the app.
- **Live Chat:** Ask questions about recipes or meals in a built-in chat window.

## Tech Stack
- React (with Vite for hot module replacement and live reload)
- Bootstrap for UI styling
- Integration with Firebase Functions for backend/API
- Google Maps and video embedding for recipe pages

## Live Reload & Proxy Setup
- The Vite development server (`npm run dev`) provides instant hot module replacement (HMR) and live reload for UI development.
- Any changes to React components, styles, or assets are immediately reflected in the browser.
- The `.env` file in this directory contains environment variables used by Vite, including `FIREBASE_PROJECT_ID` which specifies your Firebase project name.
- Vite's config (`vite.config.js`) reads this variable to dynamically set up the proxy target for API requests, forwarding `/api` calls to the correct Firebase Functions emulator, so don't forget to set it to your firebase project id.
- This setup ensures seamless integration between the frontend and backend during development, with live reload and API calls working out of the box.

### Example `.env` file
```
FIREBASE_PROJECT_ID=your-firebase-project-id
```
After updating the `.env` file, restart the Vite dev server to apply changes.

## Development Workflow
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
- API calls (e.g., for chat or recipe suggestions) are proxied to the backend (Firebase Functions) using the project name from `.env`.
- For production, the app is built and output to the `dist/` directory, which is then served by Firebase Hosting.

---

This frontend is designed for a clean, intuitive, and visually appealing user experience. For backend/API and deployment details, see the main project README.
