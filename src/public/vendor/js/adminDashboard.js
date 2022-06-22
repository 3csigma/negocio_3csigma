(function ($) {
	/* "use strict" */

	let dzChartlist = function () {
		let draw = Chart.controllers.line.__super__.draw; //draw shadow
		let screenWidth = $(window).width();

		let chartBar = function () {
			var optionsArea = {
				series: [{
					name: "Nuevas Empresas",
					data: [20, 40, 20, 80, 40, 40, 65, 5, 32, 72, 50, 20]
				}
				],
				chart: {
					height: 400,
					type: 'area',
					group: 'social',
					toolbar: {
						show: false
					},
					zoom: {
						enabled: false
					},
				},
				dataLabels: {
					enabled: false
				},
				stroke: {
					width: [4],
					colors: ['#FED061'],
					curve: 'smooth'
				},
				legend: {
					show: false,
					tooltipHoverFormatter: function (val, opts) {
						return val + ' - ' + opts.w.globals.series[opts.seriesIndex][opts.dataPointIndex] + ''
					},
					markers: {
						fillColors: ['#FED061'],
						width: 19,
						height: 19,
						strokeWidth: 0,
						radius: 19
					}
				},
				markers: {
					strokeWidth: [4],
					strokeColors: ['#FED061'],
					border: 0,
					colors: ['#fff'],
					hover: {
						size: 6,
					}
				},
				xaxis: {
					categories: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
					labels: {
						style: {
							colors: '#3E4954',
							fontSize: '14px',
							fontFamily: 'Poppins',
							fontWeight: 100,

						},
					},
				},
				yaxis: {
					labels: {
						offsetX: -16,
						style: {
							colors: '#3E4954',
							fontSize: '14px',
							fontFamily: 'Poppins',
							fontWeight: 100,

						},
					},
				},
				fill: {
					colors: ['#FED061'],
					type: 'solid',
					opacity: 0.7
				},
				colors: ['#FED061'],
				grid: {
					borderColor: '#f1f1f1',
					xaxis: {
						lines: {
							show: true
						}
					}
				},
				responsive: [{
					breakpoint: 575,
					options: {
						chart: {
							height: 250,
						}
					}
				}]
			};
			var chartArea = new ApexCharts(document.querySelector("#chartBar"), optionsArea);
			chartArea.render();

		}
		let chartBar2 = function () {
			var optionsArea = {
				series: [{
					name: "Nuevos Consultores",
					data: [40, 40, 30, 90, 10, 80, 40, 40, 30, 90, 10, 80]
				}
				],
				chart: {
					height: 400,
					type: 'area',
					group: 'social',
					toolbar: {
						show: false
					},
					zoom: {
						enabled: false
					},
				},
				dataLabels: {
					enabled: false
				},
				stroke: {
					width: [4],
					colors: ['#812082'],
					curve: 'smooth'
				},
				legend: {
					show: false,
					tooltipHoverFormatter: function (val, opts) {
						return val + ' - ' + opts.w.globals.series[opts.seriesIndex][opts.dataPointIndex] + ''
					},
					markers: {
						fillColors: ['#812082'],
						width: 19,
						height: 19,
						strokeWidth: 0,
						radius: 19
					}
				},
				markers: {
					strokeWidth: [4],
					strokeColors: ['#812082'],
					border: 0,
					colors: ['#fff'],
					hover: {
						size: 6,
					}
				},
				xaxis: {
					categories: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
					labels: {
						style: {
							colors: '#3E4954',
							fontSize: '14px',
							fontFamily: 'Poppins',
							fontWeight: 100,

						},
					},
				},
				yaxis: {
					labels: {
						offsetX: -16,
						style: {
							colors: '#3E4954',
							fontSize: '14px',
							fontFamily: 'Poppins',
							fontWeight: 100,

						},
					},
				},
				fill: {
					colors: ['#812082'],
					type: 'solid',
					opacity: 0.7
				},
				colors: ['#812082'],
				grid: {
					borderColor: '#f1f1f1',
					xaxis: {
						lines: {
							show: true
						}
					}
				},
				responsive: [{
					breakpoint: 575,
					options: {
						chart: {
							height: 250,
						}
					}
				}]
			};
			var chartArea = new ApexCharts(document.querySelector("#chartBar2"), optionsArea);
			chartArea.render();

		}
		let chartBar3 = function () {
			var optionsArea = {
				series: [{
					name: "Informes generados",
					data: [20, 15, 50, 20, 50, 30, 18, 25, 60, 15, 20, 45]
				}
				],
				chart: {
					height: 400,
					type: 'area',
					group: 'social',
					toolbar: {
						show: false
					},
					zoom: {
						enabled: false
					},
				},
				dataLabels: {
					enabled: false
				},
				stroke: {
					width: [4],
					colors: ['#50368C'],
					curve: 'smooth'
				},
				legend: {
					show: false,
					tooltipHoverFormatter: function (val, opts) {
						return val + ' - ' + opts.w.globals.series[opts.seriesIndex][opts.dataPointIndex] + ''
					},
					markers: {
						fillColors: ['#50368C'],
						width: 19,
						height: 19,
						strokeWidth: 0,
						radius: 19
					}
				},
				markers: {
					strokeWidth: [4],
					strokeColors: ['#50368C'],
					border: 0,
					colors: ['#fff'],
					hover: {
						size: 12,
					}
				},
				xaxis: {
					categories: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
					labels: {
						style: {
							colors: '#3E4954',
							fontSize: '14px',
							fontFamily: 'Poppins',
							fontWeight: 100,

						},
					},
				},
				yaxis: {
					labels: {
						offsetX: -16,
						style: {
							colors: '#3E4954',
							fontSize: '14px',
							fontFamily: 'Poppins',
							fontWeight: 100,

						},
					},
				},
				fill: {
					colors: ['#50368C'],
					type: 'solid',
					opacity: 0.7
				},
				colors: ['#50368C'],
				grid: {
					borderColor: '#f1f1f1',
					xaxis: {
						lines: {
							show: true
						}
					}
				},
				responsive: [{
					breakpoint: 575,
					options: {
						chart: {
							height: 250,
						}
					}
				}]
			};
			var chartArea = new ApexCharts(document.querySelector("#chartBar3"), optionsArea);
			chartArea.render();

		}

		/** GRÁFICA PARA INDICADORES */

		let chartIndicadores1 = function () {
			let valAnalisis1 = document.getElementById('jsonAnalisisAdm1').value;
			let valAnalisis2 = document.getElementById('jsonAnalisisAdm2').value;
			let chartAnalisis1 = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]
			let chartAnalisis2 = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]

			if (valAnalisis1) {
				valAnalisis1 = JSON.parse(valAnalisis1)
				chartAnalisis1 = [valAnalisis1.producto, valAnalisis1.administracion, valAnalisis1.talento_humano, valAnalisis1.finanzas, valAnalisis1.servicio_cliente, valAnalisis1.operaciones, valAnalisis1.ambiente_laboral, valAnalisis1.innovacion, valAnalisis1.marketing, valAnalisis1.ventas]
			}
			if (valAnalisis2) {
				valAnalisis2 = JSON.parse(valAnalisis2)
				chartAnalisis2 = [valAnalisis2.producto, valAnalisis2.administracion, valAnalisis2.talento_humano, valAnalisis2.finanzas, valAnalisis2.servicio_cliente, valAnalisis2.operaciones, valAnalisis2.ambiente_laboral, valAnalisis2.innovacion, valAnalisis2.marketing, valAnalisis2.ventas]
			}

			if ($('#chartEmpresaAdm1').length > 0) {
				const chartEmpresaAdm1 = document.getElementById("chartEmpresaAdm1").getContext('2d')

				chartEmpresaAdm1.height = 100;
				new Chart(chartEmpresaAdm1, {
					type: 'bar',
					data: {
						defaultFontFamily: 'Oblivian',
						labels: ["Producto", "Admin", "T. Humano", "Finanzas", "S. Al cliente", "Operaciones", "A. Laboral", "Innovación", "Marketing", "Ventas"],
						datasets: [{
							label: "Puntaje",
							backgroundColor: "#50368C",
							borderColor: "#50368C",
							data: chartAnalisis1,
							fill: false,
						}, 
						// {
						// 	label: "Último análisis",
						// 	fill: false,
						// 	backgroundColor: "#FED061",
						// 	borderColor: "#FED061",
						// 	data: chartAnalisis2,
						// }
					]
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

		let chartIndicadores2 = function () {
			let valDimensiones1 = document.getElementById('jsonDimensionesAdm1').value;
			let valDimensiones2 = document.getElementById('jsonDimensionesAdm2').value;
			let chartDimensiones1 = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]
			let chartDimensiones2 = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]

			if (valDimensiones1) {
				valDimensiones1 = JSON.parse(valDimensiones1)
				chartDimensiones1 = [valDimensiones1.producto, valDimensiones1.administracion, valDimensiones1.operaciones, valDimensiones1.marketing]
			}
			if (valDimensiones2) {
				valDimensiones2 = JSON.parse(valDimensiones2)
				chartDimensiones2 = [valDimensiones2.producto, valDimensiones2.administracion, valDimensiones2.operaciones, valDimensiones2.marketing]
			}

			if ($('#chartEmpresaAdm2').length > 0) {
				const chartEmpresaAdm2 = document.getElementById("chartEmpresaAdm2").getContext('2d')

				chartEmpresaAdm2.height = 100;
				new Chart(chartEmpresaAdm2, {
					type: 'bar',
					data: {
						defaultFontFamily: 'Oblivian',
						labels: ["Producto", "Administración", "Operaciones", "Marketing"],
						datasets: [{
							label: "Puntaje",
							backgroundColor: "#50368C",
							borderColor: "#50368C",
							data: chartDimensiones1,
							fill: false,
						}, 
						// {
						// 	label: "Último análisis",
						// 	fill: false,
						// 	backgroundColor: "#FED061",
						// 	borderColor: "#FED061",
						// 	data: chartDimensiones2,
						// }
					]
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

		/*************************** FIN GRÁFICA INDICADORES *******************************/

		/* Function ============ */
		return {
			load: function () {
				chartBar();
				chartBar2();
				chartBar3();
				chartIndicadores1();
				chartIndicadores2();
			},
		}

	}();

	jQuery(window).on('load', function () {
		setTimeout(function () {
			dzChartlist.load();
		}, 1000);
	});

})(jQuery);