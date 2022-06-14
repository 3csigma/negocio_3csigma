let valAnalisis1, valAnalisis2, chartAnalisis1, chartAnalisis2;
valAnalisis1 = document.getElementById('jsonAnalisis1').value;
console.log("\n<<< DATOS ANALISIS 1 >>>> ", valAnalisis1)
chartAnalisis1 = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]
chartAnalisis2 = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]
if (valAnalisis1) {
    valAnalisis1 = JSON.parse(valAnalisis1)
    chartAnalisis1 = [valAnalisis1.producto, valAnalisis1.administracion, valAnalisis1.talento_humano, valAnalisis1.finanzas, valAnalisis1.servicio_cliente, valAnalisis1.operaciones, valAnalisis1.ambiente_laboral, valAnalisis1.innovacion, valAnalisis1.marketing, valAnalisis1.ventas]
}
valAnalisis2 = document.getElementById('jsonAnalisis2').value;
if (valAnalisis2) {
    valAnalisis2 = JSON.parse(valAnalisis2)
    chartAnalisis2 = [valAnalisis2.producto, valAnalisis2.administracion, valAnalisis2.talento_humano, valAnalisis2.finanzas, valAnalisis2.servicio_cliente, valAnalisis2.operaciones, valAnalisis2.ambiente_laboral, valAnalisis2.innovacion, valAnalisis2.marketing, valAnalisis2.ventas]
}

(function () {
    $(document).ready(function () {

        var dzSparkLine = function () {
            let draw = Chart.controllers.line.__super__.draw; //draw shadow
            var screenWidth = $(window).width();

            var barChart1 = function () {
                if ($('#chartEmpresaAdm').length > 0) {
                    const chartEmpresaAdm = document.getElementById("chartEmpresaAdm").getContext('2d')

                    chartEmpresaAdm.height = 100;
                    new Chart(chartEmpresaAdm, {
                        type: 'bar',
                        data: {
                            defaultFontFamily: 'Oblivian',
                            labels: ["Producto", "Admin", "T. Humano", "Finanzas", "S. Al cliente", "Operaciones", "A. Laboral", "Innovación", "Marketing", "Ventas"],
                            datasets: [{
                                label: "Primer análisis",
                                backgroundColor: "#50368C",
                                borderColor: "#50368C",
                                data: chartAnalisis1,
                                fill: false,
                            }, {
                                label: "Último análisis",
                                fill: false,
                                backgroundColor: "#FED061",
                                borderColor: "#FED061",
                                data: chartAnalisis2,
                            }]
                        },
                        options: {
                            legend: false,
                            scales: {
                                yAxes: [{
                                    gridLines: {
                                        display: false
                                    },
                                    ticks: {
                                        beginAtZero: true,
                                        min: 0, // minimum value
                                        max: 10 // maximum value
                                    }
                                }],
                                xAxes: [{
                                    gridLines: {
                                        display: false
                                    },
                                    ticks: {
                                        fontSize: 10
                                    },
                                    barPercentage: 0.5,
                                    categoryPercentage: 1,
                                    barThickness: 14,
                                    maxBarThickness: 10,
                                }]
                            }
                        }
                    });
                }
            }

            return {
                init: function () {
                },

                load: function () {
                    barChart1();
                },

                resize: function () {
                    barChart1();
                }
            }

        }();

        $(window).on('resize', function () {
            setTimeout(function () { dzSparkLine.resize(); }, 1000);
        });

    });

})();