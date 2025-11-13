# Calorie Tracker
![Logo](./public/maxhp_banner.png)

A simple calorie tracking application built with Nuxt and powered by the FatSecret API.

## Features

*   Search for food items.
*   View detailed nutritional information for each food item.
*   Track your daily calorie intake.

## Technologies Used

*   [Nuxt](https://nuxt.com/)
*   [Vue.js](https://vuejs.org/)
*   [Tailwind CSS](https://tailwindcss.com/)
*   [FatSecret API](https://platform.fatsecret.com/)
*   [TypeScript](https://www.typescriptlang.org/)

## Getting Started

### Prerequisites

*   Node.js (v18 or newer)
*   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/Stormesh/simple-calorie-tracker.git
    cd simple-calorie-tracker
    ```

2.  Install the dependencies:
    ```bash
    npm install
    ```

3.  You will need API credentials from FatSecret. Create a `.env` file in the root of the project and add your credentials:
    ```
    FATSECRET_API_KEY=your_api_key
    FATSECRET_API_SECRET=your_api_secret
    FATSECRET_API_CLIENT_SECRET=your_api_client_secret (OAuth2 only)
    ```

### Running the Application

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Project Structure

*   `app/`: Contains the core application files, including pages, components, and composables.
*   `public/`: Static assets that are publicly accessible.
*   `nuxt.config.ts`: Nuxt configuration file.

---

Powered by [FatSecret](https://platform.fatsecret.com/).
