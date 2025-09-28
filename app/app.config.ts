export default defineAppConfig({
    ui: {
        colors: {
            primary: "slate"
        },
        progress: {
            variants: {
                color: {
                    red: {
                        indicator: "bg-red-500",
                        steps: "text-red-700"
                    },
                    orange: {
                        indicator: "bg-orange-500",
                        steps: "text-orange-700"
                    },
                    yellow: {
                        indicator: "bg-yellow-500",
                        steps: "text-yellow-700"
                    },
                    green: {
                        indicator: "bg-green-500",
                        steps: "text-green-700"
                    }
                }
            }
        }
    }
})