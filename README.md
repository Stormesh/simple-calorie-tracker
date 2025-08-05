# Calorie Tracker
![Logo](./maxhp_git.png)

A simple calorie tracking application built with Nuxt and powered by the Nutritionix API.

## Features

*   Search for food items.
*   View detailed nutritional information for each food item.
*   Track your daily calorie intake.

## Technologies Used

*   [Nuxt](https://nuxt.com/)
*   [Vue.js](https://vuejs.org/)
*   [Tailwind CSS](https://tailwindcss.com/)
*   [Nutritionix API](https://www.nutritionix.com/business/api)
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

3.  You will need API credentials from Nutritionix. Create a `.env` file in the root of the project and add your credentials:
    ```
    NUXT_PUBLIC_NUTRITIONIX_APP_ID=your_app_id
    NUXT_PUBLIC_NUTRITIONIX_APP_KEY=your_app_key
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

Powered by [Nutritionix API](https://www.nutritionix.com/business/api)
