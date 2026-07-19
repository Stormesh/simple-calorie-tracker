export default defineAppConfig({
  ui: {
    colors: {
      primary: "gaming",
    },
    progress: {
      variants: {
        color: {
          red: {
            indicator: "bg-gradient-to-r from-hp-red to-red-600",
            steps: "text-hp-red",
          },
          orange: {
            indicator: "bg-gradient-to-r from-hp-orange to-orange-600",
            steps: "text-hp-orange",
          },
          yellow: {
            indicator: "bg-gradient-to-r from-hp-yellow to-yellow-600",
            steps: "text-hp-yellow",
          },
          green: {
            indicator: "bg-gradient-to-r from-hp-green to-emerald-600",
            steps: "text-hp-green",
          },
        },
      },
    },
  },
});
