module.exports = {
    apps: [{
        name: "App3csigma",
        script: "./app.js",
        watch: ["server", "client"],
        watch_delay: 1000, // Delay between restart
        ignore_watch: [
            "node_modules",
            "**/*/certificados_consultores",
            "**/*/archivos_analisis_empresa",
            "**/*/foto_profile",
            "**/*/informes_empresas",
            "**/*/propuestas_analisis",
        ],
        env_production: {
            NODE_ENV: "production"
        },
        env_development: {
            NODE_ENV: "development"
        }
    }]
}