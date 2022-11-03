module.exports = {
    apps: [{
        name: "App3csigma",
        script: "./app.js",
        watch: ["server", "client"],
        watch_delay: 1000, // Delay between restart
        ignore_watch: [
            "node_modules",
            "public/certificados_consultores",
            "public/archivos_analisis_empresa",
            "public/foto_profile",
            "public/informes_empresas",
            "public/propuestas_analisis",
        ],
        env_production: {
            NODE_ENV: "production"
        },
        env_development: {
            NODE_ENV: "development"
        }
    }]
}